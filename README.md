# README

## 渲染管线

```text
┌─────────────── TypeScript (Bun) ─────────────────┐
│                                                  │
│  .vue SFC ──→ Widget Tree ──→ emitDrawCommands() │
│       (compiler)   (Vue reactivity)       │      │
│                                           ▼      │
│                                   DrawListBuffer │
│                                  (shared memory) │
└──────────────────────┬───────────────────────────┘
                       │ FFI: renderDrawList(ctx, buf, len)
                       ▼
┌─────────────── Zig (Native) ─────────────────────┐
│                                                  │
│  Parse Commands ──→ Rasterize ──→ Cell Grid      │
│  (draw_list/)      (per-cmd)    (TuiFrame)       │
│                                      │           │
│                                      ▼           │
│                                 Diff + ANSI ───────────► Terminal
└──────────────────────────────────────────────────┘

每帧流程: reset buffer → widget tree 生成 commands → FFI 传给 Zig → 光栅化到 cell grid → diff 脏区 → 输出 ANSI
```

## 目标

- 一个很cool的terminal ui框架
- 让用户像使用 vue 一样使用本框架。
  - 提供热重载
  - 提供多种内置widget
  - 用户通过编写 .vue 文件可轻松编排layout
  - 提供@click、@drag、@keydown等事件
  - 用户在script标签中写的ts代码为bun环境的代码、可轻松执行本地命令、访问本地资源
- 将一些操作系统的体验也融入进来
  - 提供场景概念、切换场景
  - 提供窗口概念、最大化最小化（计划中）

## zig 命名规则

### 函数

- 使用 camelCase
- **申请资源必须和释放资源一一对应**. 比如：
  - `create`Object() and `destroy`Object()
  - `init`Source() and `deinit`Source()
  - `open`Streaming() and `close`Streaming()
  - `connect`() and `disconnect`()
  - `lock`() and `unlock`()
  - `alloc`One() and `free`Arr() / `destroy`One()
  - `register`() and `unregister`()
  - `load`() and `unload`()
  - `start`() and `stop`()
  - `enter`() and `exit`()

### 变量

- 局部变量使用 snake_case
- 全局变量使用 SCREAMING_SNAKE_CASE
- 函数使用 camelCase
- 结构体使用 PascalCase

## undefined 和 null

严格区分undefined 和 null
`undefined` 是技术上的空
`null` 是业务逻辑上的空

### ts 类型

- undefined: 意味着“这个值仅仅是因为技术原因，现在还没有准备好”，比如一个处于pending状态的请求/懒加载之类的
- null: 意味着“这个值是业务逻辑上的空”，也许用户甚至直接可以把这个值设置为空，这个业务的值本身就可以是`null`。这个null是不常见但必要的，如果没有这个空我就要定义下面这一坨东西了

```typescript
type ParseResult<File> = Bolb | object | 'IO错误了所以Result是空，注意不是undefined，我已经尽最大努力尝试过了'
```

### zig 类型

- undefined: 意味着“仅仅是因为初始化未准备好，所这个值还没有准备好”
- null: 可选值：`var serch_result: ?usize = null;`

## 待办列表

- 基本开发
  - [x] 组件热重载
  - [x] types支持
  - [x] 组件生命周期
  - [x] 日志
  - [x] 主题系统
  - [ ] 文档
- 内置组件
  - [x] Box / Panel
  - [x] Text
  - [x] Input / TextField
  - [x] Button / Checkbox / Switch
  - [x] RadioGroup / SelectButton
  - [x] ProgressBar
  - [x] ScrollBox
  - [ ] Flex / Stack 布局引擎
- 拓展组件
  - [x] 帧率检查 (Framerate)
  - [x] 可拖拽的组件
  - [x] Matrix 动画
  - [x] Snake 游戏
  - [x] VideoPlayer (braille渲染)
  - [x] Logger
- 跨平台
  - [ ] POSIX raw-mode (termios)
  - [ ] POSIX 输入监听
  - [ ] CI: Linux/macOS 构建
- 生态
  - [x] CLI scaffolding (`bunx create-buntui`)
  - [x] 预编译二进制分发 (`@buntui/native-platforms`)
  - [ ] 文档站
  - [ ] 插件系统
  - [ ] DevTools
- 强交互
  - [ ] 自定义热键
  - [ ] 窗口（最大化/最小化）
  - [ ] 屏保动画
