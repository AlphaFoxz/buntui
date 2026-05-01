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
                       │ FFI: renderDrawList(buf, len)
                       ▼
┌─────────────── Zig (Native) ─────────────────────┐
│                                                  │
│  Parse Commands ──→ Rasterize ──→ Cell Grid      │
│  (draw_list/)      (per-cmd)    (TuiFrame)  │    │
│                                             │    │
│                                      Diff + ANSI │
│                                          ───────────► Terminal
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
  - 用户在script标签中写的ts代码为node环境的代码、可轻松执行本地命令、访问本地资源
- 将一些操作系统的体验也融入进来
  - 提供窗口概念、最大化最小化
  - 提供场景概念、切换场景
- 打包产物为 bun 引擎可直接运行的mjs文件

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

- [ ] 屏保动画
- [ ] 更好的事件系统
- [ ] 可拖拽的组件
- [ ] 自定义热键
- [ ] 帧率检查
