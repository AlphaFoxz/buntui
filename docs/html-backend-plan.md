# HTML Backend — 设计决策记录

BuntUI 支持在浏览器中渲染 TUI 应用，采用 **WASM + ANSI passthrough** 方案：将现有 Zig 光栅化器编译为 wasm32，TS 将 `DrawListBuffer` 二进制传递给 WASM，WASM 输出 ANSI 字符串，由浏览器端终端模拟器（xterm.js）写入。不涉及 DOM 操作 UI 元素。

源自 GitHub issue #43。

## 核心架构

```
Native:  TS → DrawListBuffer (binary) → FFI → Zig rasterizer → ANSI → stdout
HTML:    TS → DrawListBuffer (binary) → WASM → Zig rasterizer (同一份代码) → ANSI → JS 读取 buffer → xterm.js Terminal.write()
```

同一份 Zig 代码，两个编译目标。TS 侧无需移植光栅化器。

### 实现状态

| 组件 | 文件 | 说明 |
|---|---|---|
| WASM 后端 | `packages/core/src/app/HtmlBackend.ts` | 实现 `TuiBackend` 接口，封装 WASM 调用 + xterm.js 输出 |
| WASM Zig 入口 | `packages/native/src/wasm_lib.zig` | WASM 专用导出：`renderDrawListToBuffer` / `getOutputPtr` / `getOutputLen` / `setTerminalSize` / `allocWasmBuffer` / `deallocWasmBuffer` / `createTuiContext` / `updateTuiContext` / `destroyTuiContext` |
| WASM 二进制 | `packages/native-platforms/wasm32-wasi/` | 预编译产物，CI 交叉编译 |
| 浏览器平台层 | `packages/core/src/platform/browser.ts` | 无 `bun:ffi`、无 `node:*` 的平台 shim |
| 原生平台层 | `packages/core/src/platform/native.ts` | Bun FFI + Node API 的平台 shim |
| 平台切换 | `packages/core/package.json` 的 `"browser"` 字段 | 打包器/Vite 自动将 `native.js` 替换为 `browser.js` |
| 调度器抽象 | `packages/core/src/platform/next-tick.ts` | `immediateScheduler`（Bun `setImmediate`）/ `animationFrameScheduler`（浏览器 `requestAnimationFrame`） |
| WASM 消费端 | `packages/playground-wasm/src/web-api.ts` | `WasmModule` 加载 + `HtmlBackend` 创建 + `createApp` 启动 |
| Web 演示 | `packages/github-pages/` | Vite + xterm.js，导入 playground-wasm 编译产物 |

## 设计决策

### 为什么选 WASM 而非 TS 移植

| | TS 移植 | WASM（最终选择） |
|---|---|---|
| 代码量 | ~2000 行（移植 rasterizer + presenter） | ~340 行（4 个 stub 模块 + WASM 入口） |
| 维护成本 | 两套光栅化器需同步 | 一份代码，native 和 HTML 共享 |
| 性能 | 够用 | 更优（原生内存布局，无 GC 压力） |
| 风险 | 手动移植的潜在 bug | 与 native 相同的经过验证的代码 |

### Zig 代码可移植性分析

**直接编译为 wasm32 的模块（零修改，~2000 行）**：

- `draw_list/commands.zig` — 纯类型和枚举
- `draw_list/binary.zig` — LE 字节读取，零依赖
- `draw_list/rasterizer.zig` — 纯计算，写入 cell 数组
- `draw_list/parser.zig` — 纯计算
- `draw_list/clip_stack.zig` — 纯数据结构
- `ansi_util/*.zig` — 使用 `anytype` writer，不绑定 stdout
- `render/frame.zig` — 使用 `c_allocator`（WASI 兼容）
- `core/event_bus.zig` — 无锁原子操作，无 OS 调用
- `core/typedef.zig` — 类型别名

**需要 WASM stub 的模块（~340 行，在 `wasm_lib.zig` 中处理）**：

| 模块 | 问题 | WASM 替代方案 |
|---|---|---|
| `core/std_io.zig` | 绑定 stdout | 写入 `ArrayList(u8)` 内存 buffer；JS 通过 WASM 导出读取 |
| `core/logger.zig` | 文件 I/O + 线程 | No-op stub（如需则通过 JS console） |
| `core/tui_context.zig` | `detectTermSize()` 依赖 kernel32/posix | 保留结构体，`detectTermSize` → no-op；JS 通过 `setTerminalSize()` 设置尺寸 |
| `core/error.zig` | `std.process.exit()` | 替换为 `@panic`/`@trap` |

### 平台抽象层设计

`TuiApp` 通过依赖注入接受 `{backend?: TuiBackend}`，默认为 `NativeBackend`（Zig FFI）。`TuiBackend` 接口有 7 个方法：`setupLogger` / `startApp` / `stopApp` / `detectTermSize` / `renderDrawList` / `startEvents` / `stopEvents`。

HTML 后端只需实现此接口，无需修改接口本身。

平台差异通过 `packages/core/src/platform/` 下的两个模块隔离：

- **`native.ts`**：使用 `bun:ffi` 的 `ptr()`、`node:process`、`node:path`、`Bun.main`、`node:fs`
- **`browser.ts`**：无 FFI（`createBackend()` 抛出错误，提示需手动传入 backend）、`getNodeProcess()` 返回 `undefined`、文件日志降级为 `ConsoleLogSink`

通过 `core/package.json` 的两个机制切换：

```jsonc
// exports 中的条件导出（打包器消费）
"./platform": {
  "browser": { "types": "./dist/platform/browser.d.ts", "default": "./dist/platform/browser.js" },
  "types": "./dist/platform/native.d.ts",
  "default": "./dist/platform/native.js"
}

// 顶层 browser 字段（Bun 消费）
"browser": { "./dist/platform/native.js": "./dist/platform/browser.js" }
```

### Bun/Node API 审计结果

Widget 层和事件系统完全干净（纯 TS）。以下基础设施的 Bun/Node 依赖已全部通过平台抽象层解决：

| Bun/Node API | 解决方式 |
|---|---|
| `bun:ffi` Pointer/ptr | `platform/pointer.ts` 抽象；browser = `number`（WASM 线性内存地址） |
| `Bun.color()` | 轻量 CSS 颜色解析器替代 |
| `setImmediate` | `platform/next-tick.ts` 的 `Scheduler` 抽象；browser 回退到 `setTimeout` 或 `requestAnimationFrame` |
| `process.exit/on` | `getNodeProcess()` 守卫 |
| `Bun.main` | `getDefaultLogDir()` 平台方法；browser 跳过文件日志 |
| `node:fs/path` | `createFileLogSink()` 平台方法；browser 返回 `ConsoleLogSink` |
| `node:child_process` | 懒加载实例化；browser 使用 `navigator.clipboard` |
| `node:buffer/process` | `btoa()` 替代 `Buffer`；dev-only，从 browser 构建中排除 |
