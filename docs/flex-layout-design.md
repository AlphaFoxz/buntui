# Flex 布局引擎 — 设计决策记录

`BoxWidget` 的布局引擎已从单遍打包器扩展为支持 CSS flexbox 核心语义的两遍 measure/arrange 引擎。本文记录设计过程中的关键决策与已拒绝的特性。

对标 HTML `display: flex`。源自已删除的 ROADMAP.md task 2-2 "Flex / Stack layout engine"。

## 实现概述

Flex 算法集中在 `packages/core/src/widgets/layout-flex.ts`，导出纯函数 `computeFlexLayout()`，`BoxWidget` 和 `ScrollBoxWidget` 均调用它——消除了原先两处重复的 `#computeLayout`。

### 已实现功能

| 优先级 | 功能 | 说明 |
|---|---|---|
| P0 | `#layoutDirty` 标记 | 布局脏标记，避免每帧重算 |
| P0 | 行为测试覆盖 | `align` 交叉轴定位、水平主轴放置、gap 间距、`%` 尺寸子组件断言 |
| P1 | `justifyContent` | 主轴空闲空间分布：`start` / `center` / `end` / `space-between` / `space-around` / `space-evenly` |
| P1 | `flexGrow` (per-child) | 空闲空间按比例分配——侧栏 + 主内容区的关键能力 |
| P1 | 反转方向 | `direction` 取值扩展为 `horizontal` / `vertical` / `horizontal-reverse` / `vertical-reverse` |
| P2 | `flexShrink` (per-child) | 优雅的溢出压缩而非裁剪 |
| P2 | `flexBasis` (per-child) | 主轴起始尺寸提示，支持 `number` 和 `'${number}%'` |
| P2 | `alignSelf` (per-child) | 单个子组件覆盖父级 `align` |
| P3 | `flexWrap` + `alignContent` | greedy 断行 + 逐行独立 flex 分配 + 6 种 alignContent 行间分布 |
| P3 | 共享 `layout-flex.ts` 模块 | Box 和 ScrollBox 的布局逻辑统一到单一模块 |

### 已拒绝特性

- **`align-items: baseline`** — TUI 等宽单元格网格中，所有文本天然占据完整 cell，不存在亚像素基线区分。`baseline` 对齐在 TUI 中等效于 `start`（第一行文本都在 box 顶部），语义无意义。布局引擎工作在 Box 层而非 Text 层，实现真正的 baseline 需要每个 widget 暴露文本基线偏移，架构成本与收益不匹配。不同高度的子组件对齐需求由 `align: start` / `center` / `end` 完全覆盖，极端 case 用 `alignSelf` 微调。
- **`order: number`** — TUI 中直接调整 children 数组顺序即可，无需视觉重排属性。

## 设计决策

### Per-child 元数据存放位置

`flexGrow` / `flexShrink` / `flexBasis` / `alignSelf` 存储在 `TuiWidgetEntity` 上（`packages/core/src/widgets/TuiWidgetEntity.ts`）+ setter 方法。

**选择理由**：与现有 `zIndex` / `visible` / `hasPercentLayout` 字段模式一致，SFC 编译器作为子组件的 props 透传即可。备选方案（`BoxWidget.addChild` 上接受 layout-only props 包装器）分离更彻底，但 API 面更大，SFC 编译器也需要新语法。

### 两遍 measure/arrange 架构

`flex-grow` / `flex-shrink` 要求先聚合所有子组件的基础尺寸才能计算空闲空间，因此布局拆为两遍：

1. **Measure 遍**：聚合每个子组件的 `flex-basis` / `intrinsicSize` / `rect`，计算 `totalBase` 和 `freeSpace`
2. **Arrange 遍**：按 `flex-grow` 比例分配 `freeSpace`（或按 `flex-shrink` 压缩），然后定位

### 尺寸模型缺陷（已知限制）

多数 widget 的 `intrinsicSize()` 返回的是当前 `rect`（非内容派生尺寸）——只有 `TextWidget` 和 `SelectButtonWidget` 测量真实内容。影响：

- `flex-basis: auto`（HTML 默认）语义不可靠
- **当前默认 `flexBasis` 解析为 `0`**（仅 grow 模式），以获得可预测行为
- 长期改进方向：逐个修复 widget 的 `intrinsicSize()` 让它返回真实内容尺寸

### `direction` vs `flexDirection` 命名

HTML 用 `flex-direction`，现有 API 是 `direction`。

**选择扩展 `direction`** 取值（加 `*-reverse` 变体），优先向后兼容。`direction` 在 CSS 中另有含义（文本方向），但 TUI 语境下无歧义。如未来需更接近 HTML 命名，可加 `flexDirection` 作为别名。

### `flexWrap` 实现策略

greedy 断行（贪心填充直到溢出）+ 逐行独立 flex 分配。每行的 cross extent 取该行内最大子组件的自然交叉轴尺寸。`alignContent` 控制行间空闲空间分布（6 种模式，复用 `computeSpaceDistribution`）。

与嵌套 Box 的区别：嵌套 Box 是静态网格，不响应终端 resize；`flexWrap` 能在终端宽度变化时自动回流换行。

### 布局失效

`BoxWidget` 使用 `#layoutDirty` 标记（原先每帧重跑布局）。在 `updateRect` / `updatePadding` / `updateBorder` / `setDirection` / `setGap` / `setAlign` / `addChild` / `removeChild` 上置脏，`emitDrawCommands` 时仅在脏时重算。两遍 flex 数学的开销因此被限制在变更帧。

## SFC 编译器联动

每个布局属性端到端打通链路：

1. `BoxWidgetOptions`（`BoxWidget.ts`）
2. 私有字段 + 构造器 + setter
3. `computeFlexLayout()` 算法（`layout-flex.ts`）
4. `TuiWidgetEntity` 上的 per-child 字段 + setter
5. SFC 编译器属性转发（`runtime-helpers.ts` PropHandler 注册）
6. 文档面板（`packages/playground-wasm/src/apps/main/components/BoxDemo.vue`）

## 受影响文件

| 文件 | 职责 |
|---|---|
| `packages/core/src/widgets/layout-flex.ts` | Flex 算法纯函数（核心模块） |
| `packages/core/src/widgets/box/BoxWidget.ts` | Box 实现，调用 `computeFlexLayout` |
| `packages/core/src/widgets/scroll-box/ScrollBoxWidget.ts` | ScrollBox 实现，调用 `computeFlexLayout` |
| `packages/core/src/widgets/types.ts` | `TuiLayoutAlignment` / `TuiLayoutDirection` / `TuiJustifyContent` / `TuiFlexWrap` / `TuiAlignContent` 类型 |
| `packages/core/src/widgets/TuiWidgetEntity.ts` | per-child 元数据（`flexGrow` / `flexShrink` / `flexBasis` / `alignSelf`） |
| `packages/compiler/src/runtime-helpers.ts` | SFC PropHandler 注册 |
| `packages/playground-wasm/src/apps/main/components/BoxDemo.vue` | 用户文档 |
