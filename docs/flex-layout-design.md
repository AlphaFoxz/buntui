# Flex 布局引擎设计

扩展 `BoxWidget` 的布局引擎以支持 CSS flexbox 核心语义。当前引擎仅是带 `direction` / `gap` / `align`(交叉轴)的单遍打包器——无法在主轴上分配空闲空间、让子组件增长填充剩余空间,也无法反转方向。这阻塞了常见的 TUI 布局(例如:侧栏 + 主内容区,主区需吸收剩余宽度;状态栏按钮需右对齐)。

对标 HTML `display: flex`。源自已删除的 ROADMAP.md task 2-2 "Flex / Stack layout engine"。

## 现状

`BoxWidget.#computeLayout`(`packages/core/src/widgets/box/BoxWidget.ts`):

- `direction`:`'horizontal' | 'vertical'`(`'vertical'` 默认)— ✓
- `gap`:仅主轴 — ✓
- `align`:`'start' | 'center' | 'end' | 'stretch'`(交叉轴,`'stretch'` 默认)— ✓
- 主轴打包:**始终从 start 开始**(`BoxWidget.ts:474`),空闲空间被忽略
- 尺寸:intrinsic-or-rect 单遍——无 measure/arrange,无约束协商
- `TuiWidgetEntity` 上无 per-child 布局属性
- 布局触发:每次 `emitDrawCommands` 都重跑(无 dirty 标记)

布局逻辑还在 `ScrollBoxWidget.#computeLayout`(`scroll-box/ScrollBoxWidget.ts`)中重复了一份(更受限:仅竖向、强制宽度 stretch)。

## TODO 列表

### P0 — 前置条件(已完成)

- [x] **0-1** `BoxWidget` 加 `#layoutDirty` 标记 — 当前每帧都重跑布局,引入更复杂的 flex 数学后会成为性能瓶颈。在 `updateRect`(仅尺寸变更)/ `updatePadding` / `updateBorder` / `setDirection` / `setGap` / `setAlign` / `addChild` / `removeChild` 上置脏,`emitDrawCommands` 时仅在脏时重算。
- [x] **0-2** 补齐 `BoxWidget` 行为测试 — 当前 `BoxWidget.test.ts` 对 `align` 交叉轴定位、水平主轴放置、gap 实际位置、`%` 尺寸子组件**零断言**(只有 setter 冒烟测试 `:170-183`)没有这些测试无法安全重构算法。

### P1 — 必须特性(已完成)

- [x] **1-1** `justifyContent: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'` — 主轴空闲空间分布。最常见的需求(右对齐状态栏按钮、居中标题、两端对齐工具栏)。
- [x] **1-2** `flexGrow: number`(per-child)— 基础空闲空间分配。TUI 中**关键**:让某个面板吸收剩余终端字符格(侧栏 + 主内容区)。
- [x] **1-3** 反转方向:扩展 `direction` 取值为 `'horizontal' | 'vertical' | 'horizontal-reverse' | 'vertical-reverse'`。

### P2 — 应当特性(中等复杂度)

- [ ] **2-1** `flexShrink: number`(per-child)— 优雅的溢出压缩而非裁剪。
- [ ] **2-2** `flexBasis: number | '${number}%'`(per-child)— 主轴起始尺寸提示。
- [ ] **2-3** `alignSelf: 'start' | 'center' | 'end' | 'stretch'`(per-child)— 单个子组件覆盖父级 `align`。

### P3 — 推迟(TUI 价值存疑或 API 面太大)

- [ ] **3-1** `flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse'` + `alignContent` — TUI 中无文本回流,但离散瓦片包裹有用。具体用例出现时再开 follow-up。
- [ ] **3-2** `order: number`(per-child)— 视觉重排而不动 DOM 顺序。需求低。
- [ ] **3-3** `align-items: baseline` — TUI 均匀行高下意义不大,可能永远不需要。
- [ ] **3-4** 提取共享 `layout-flex.ts` 模块 — 把 `BoxWidget.#computeLayout` 和 `ScrollBoxWidget.#computeLayout` 的重复逻辑合并,防止进一步漂移。出 flex v1 范围,值得 follow-up。

## 设计考量

### Per-child 元数据存放位置

`flexGrow` / `flexShrink` / `flexBasis` / `alignSelf` 需要 per-child 存储。两个方案:

- **(a) 加到 `TuiWidgetEntity` 上**(`packages/core/src/widgets/TuiWidgetEntity.ts`)+ setter 方法。API 统一,与现有 `zIndex` / `visible` / `hasPercentLayout` 一致;但所有 widget 都耦合到 flex 概念。
- **(b) `BoxWidget.addChild` 上接受 layout-only props**(包装器)。分离更彻底,但 API 面更大,SFC 编译器也需要新语法。

**推荐 v1 用 (a)**:与现有 base entity 字段模式一致,SFC 编译器作为子组件的 props 透传即可。

### 两遍 measure/arrange

`flex-grow` / `flex-shrink` 必须先聚合所有子组件的基础尺寸,才能知道空闲空间,意味着当前的单遍布局(`BoxWidget.ts:449-500`)必须拆为:

1. **Measure 遍**:聚合每个子组件的 `flex-basis`/`intrinsicSize`/`rect`,计算 `totalBase` 和 `freeSpace`
2. **Arrange 遍**:按 `flex-grow` 比例分配 `freeSpace`,然后定位置

这是 flex 算法的核心重构,需要先有 P0-2 的测试覆盖做安全网。

### 布局失效

`BoxWidget` 当前每帧重跑布局(无 dirty 标记)。`ScrollBoxWidget` 用 `#layoutDirty`。引入两遍 flex 数学后,每帧成本会显著上升,**P0-1 的 dirty 标记是必要的**。

### 尺寸模型缺陷(需要文档化)

多数 widget 的 `intrinsicSize()` 返回的是当前 `rect`(非内容派生尺寸)——只有 `TextWidget` 和 `SelectButtonWidget` 测量真实内容。这意味着:

- `flex-basis: auto`(HTML 默认)语义在修复前不可靠
- **建议 v1 默认 `flex-basis: 0`(仅 grow 模式)**,获得可预测行为
- 长期:逐个修复 widget 的 `intrinsicSize()` 让它返回真实内容尺寸(独立工作项)

### `direction` vs `flexDirection` 命名

HTML 用 `flex-direction`,现有 API 是 `direction`。两个选择:

- **扩展 `direction` 取值**:加 `*-reverse` 变体。向后兼容,但 `direction` 这个名字在 HTML 里另有含义(CSS `direction` 是文本方向)。
- **新增 `flexDirection`**:更接近 HTML,作为 `direction` 的超集。需要 deprecate `direction` 或让两者共存(冲突时谁优先?)。

**推荐扩展 `direction`**(向后兼容优先)。如果未来要更接近 HTML 命名,可以加 `flexDirection` 作为别名。

## SFC 编译器联动

每个新属性都需要端到端打通:

1. `BoxWidgetOptions`(`BoxWidget.ts:32-51`)
2. 私有字段 + 构造器 + setter(`BoxWidget.ts:110-147, 272-286`)
3. `#computeLayout` 算法重写(`BoxWidget.ts:449-500`)
4. `TuiWidgetEntity` 上的 per-child 字段(`TuiWidgetEntity.ts:51-359`)
5. SFC 编译器属性转发(`packages/compiler/src/runtime-helpers.ts`)—— PropHandler 注册
6. 更新 `BoxDemo.vue` 文档面板(`packages/playground-wasm/src/apps/main/components/BoxDemo.vue:13-15`)

## 测试缺口

当前 `BoxWidget.test.ts` 对以下行为零断言:

- `align` 各模式的交叉轴定位(只有 setter 冒烟测试 `:170-183`)
- 水平主轴放置(`intrinsicSize` 测试断言尺寸,不断言位置)
- gap 在实际位置中产生的间距
- `%` 尺寸子组件(`child.hasPercentLayout → resolveLayout` 路径未覆盖)

**P0-2 是 flex 算法重构的安全网**——没有这些测试,重写 `#computeLayout` 风险极大。

## 受影响文件

| 文件 | 职责 |
|---|---|
| `packages/core/src/widgets/box/BoxWidget.ts` | 主实现 |
| `packages/core/src/widgets/types.ts` | `TuiLayoutAlignment` / `TuiLayoutDirection` 类型扩展 |
| `packages/core/src/widgets/TuiWidgetEntity.ts` | per-child 元数据(`flexGrow` / `alignSelf` 等) |
| `packages/compiler/src/runtime-helpers.ts` | SFC PropHandler 注册 |
| `packages/playground-wasm/src/apps/main/components/BoxDemo.vue` | 用户文档 |
