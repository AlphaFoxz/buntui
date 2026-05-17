# 帧率控制与渲染优化

现状分析与优化方案。适用于需要支持复杂场景（大量 widget、高频动画、实时数据）的后续演进。

## 当前渲染管线

### 驱动方式

`packages/core/src/app/RenderLoop.ts` 使用 `setTimeout` 自调度链：

```
start()
  └── setTimeout(tick, 0)        // 首帧立即执行
        └── tick()                // 每次调用:
              ├── scene.emitDrawCommands(drawList)
              ├── backend.renderDrawList(context, drawList)
              └── setTimeout(tick, 5)   // 5ms 后重新调度
```

### 事件循环

`packages/core/src/app/NativeBackend.ts` 使用独立的 `setImmediate` 自调度链消费 Zig 事件总线的 SPSC 环形缓冲区。事件循环与渲染循环完全解耦——事件不触发渲染，渲染也不检查事件。

### Tick 递增

`TUI_CONTEXT_INSTANCE.tick` 是 TS/Zig 共享内存中的 `u64` 字段，在 Zig 侧 `renderDrawList()` 的最后一步递增（`ctx.tick += 1`）。每次成功的 FFI 渲染调用 = 一次 tick。

### Zig 侧已有的优化

`frame.zig` 已实现双缓冲 + 逐 cell diff——即使 TS 每帧发送全量 draw list，Zig 实际写入 stdout 的只是前后帧之间的差量。这意味着 TS 侧"冗余"重建 draw list 的成本仅为往 ArrayBuffer 写入字节的纯内存操作（微秒级），不会产生额外的 ANSI 输出开销。

## 现存问题

| 问题 | 影响 |
|------|------|
| **无可配置帧率上限** | 固定 ~5ms 间隔（理论 ~200FPS），空闲时 CPU 持续占用 |
| **事件与渲染完全解耦** | 输入事件不会触发立即重绘，响应延迟取决于下一帧调度时间 |

## 为什么不做脏标记

脏标记在 GUI/浏览器渲染中是核心优化手段，但在 TUI 框架中投入产出比不高：

1. **TS 侧重建 draw list 成本极低** — 纯内存写入，微秒级，即使每帧全量重建也不是瓶颈
2. **Zig 侧已优化** — cell 级 diff 保证只有变化的单元格才会输出 ANSI 序列，真正昂贵的 I/O 已经是最小化的
3. **维护成本高** — 每个状态变更点都必须 `markDirty`，漏一个就是 UI 不更新；动画、定时器等场景天然每帧都脏，标记没有收益
4. **增加使用门槛** — 框架用户需要理解"什么时候会自动重绘、什么时候需要手动请求"，与 TUI 的简洁定位不符

## 优化方案

### P1 — 可配置帧率上限

**目标：** 限制最大 CPU 占用，默认 60FPS。

**方案：**

1. `RenderLoop` 构造参数增加 `maxFps?: number`（默认 60）
2. 计算最小帧间隔：`minInterval = 1000 / maxFps`
3. `tick()` 内记录上次渲染时间戳，如果距上次渲染不足 `minInterval`，则延迟调度
4. 使用 `setTimeout(tick, remaining)` 替代固定 `setTimeout(tick, 5)`

```typescript
// 伪代码
tick() {
  render();
  this.#lastFrameTime = performance.now();

  const elapsed = performance.now() - this.#lastFrameTime;
  const delay = Math.max(0, this.#minInterval - elapsed);
  this.#timer = setTimeout(this.#tick, delay);
}
```

**改动范围：** `RenderLoop.ts` 构造函数 + tick 方法、`TuiApp.ts` 传递 maxFps 配置。

### P2 — 事件驱动立即重绘

**目标：** 输入响应延迟最低化。

**方案：**

1. 事件循环消费到事件后，如果距上次渲染已超过 `minInterval`，立即调度一帧
2. 如果距上次渲染不足 `minInterval`，等待当前排期的帧执行即可（自然合并）
3. 对于需要即时反馈的事件（鼠标拖动、键盘输入），可以考虑对特定事件类型跳过帧率限制

**改动范围：** `NativeBackend.ts` 事件消费回调、`RenderLoop.ts` 增加立即调度能力。

## 推荐实施顺序

```
P1 (帧率上限) → P2 (事件驱动重绘)
```

P1 改动最小、收益最大（从 ~200FPS 降到 60FPS 直接砍掉 2/3 CPU 占用）。P2 在 P1 基础上进一步降低输入响应延迟。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `packages/core/src/app/RenderLoop.ts` | P1/P2 核心改动 |
| `packages/core/src/app/NativeBackend.ts` | P2 事件消费后触发重绘 |
| `packages/core/src/app/TuiApp.ts` | 传递 maxFps 配置 |
