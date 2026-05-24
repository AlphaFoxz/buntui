# ColorTheme 系统改进路线图

## TODO

### P0 — 补齐基础设施

- [x] 消除 SwitchWidget 硬编码颜色（`SWITCH_CROSS` / `SWITCH_CHECK` / `SWITCH_DIM`），替换为主题 token
- [x] 移除 InputWidget 构造函数中的冗余 `?? 0x...` 回退值
- [x] BoxWidget / TextWidget / ScrollBoxWidget 构造器默认值改用 `getTheme()`
- [x] 确保 `new XxxWidget()` 和 `createXxx()` 两条路径行为一致
- [x] `provider.ts` 增加 `onThemeChange()` 订阅/通知机制
- [ ] `TuiApp.setTheme()` 触发全局重渲染（标记 dirty → 下一帧重绘）
- [ ] Widget 颜色延迟解析：`emitDrawCommands()` 时从当前主题 + 本地覆盖计算

### P1 — 完善主题 Token

- [x] `TuiThemeColors` 新增 `success` / `successMuted` / `danger` / `dangerMuted` / `warning`
- [x] `TuiThemeColors` 新增 `placeholder`（`indicator` 不需要 — Switch cross→`danger`，check→`success`，dim→`textMuted`）
- [x] 实现 `resolveWidgetColors()` 统一主题解析工具函数
- [x] 各 widget 迁移到 `resolveWidgetColors()`，消除重复映射代码

### P2 — 生态完善

- [ ] `TuiTheme` 增加 `widgets?` 组件级主题覆盖字段
- [ ] 内置 `catppuccinLatte`（亮色）主题
- [ ] 内置 `nord`（暗色）主题
- [ ] 内置 `highContrast`（高对比度）主题

### P3 — SFC 主题集成

- [ ] 编译器识别 `useTheme()` 响应式绑定
- [ ] SFC 模板支持主题 token 字符串（如 `colorFg="text"`）

---

## 现有架构

```
provider.ts (全局单例) → getTheme() → 各 widget getDefault*Options() → 构造时解析到 #private 字段
```

核心文件：

| 文件 | 职责 |
|------|------|
| `packages/core/src/theme/provider.ts` | 全局主题单例，`getTheme()` / `setTheme()` |
| `packages/core/src/theme/themes.ts` | 内置主题定义（当前仅有 `catppuccinMocha`） |
| `packages/core/src/theme/types.ts` | `TuiTheme` / `TuiThemeColors` / `TuiThemeBorderStyle` 类型 |
| `packages/core/src/theme/use-theme.ts` | `useTheme()` 便捷函数（SFC 场景） |
| `packages/core/src/widgets/color-scheme.ts` | `ColorScheme<T>` 多状态颜色解析 |

---

## 现状问题

### 1. 颜色硬编码散落各处

| Widget | 问题 |
|--------|------|
| **SwitchWidget** | `SWITCH_CROSS = 0xF3_8B_A8_FF`、`SWITCH_CHECK = 0xA6_E3_A1_FF`、`SWITCH_DIM = 0x6C_70_86_FF` 三个语义色直接写死为常量，不在 `TuiThemeColors` 中 |
| **InputWidget** | 构造函数中 `?? 0xFF_FF_FF_FF`、`?? 0x1E_1E_2E_FF` 等冗余回退值重复了主题已提供的颜色 |
| **BoxWidget / TextWidget** | 构造器用硬编码默认色（`0xFF_FF_FF_FF`、`0x00_00_00_FF`），只有工厂函数 `createBox()` 才读主题 |
| **ScrollBoxWidget** | `DEFAULT_SCROLL_BOX_OPTIONS` 里 scrollbar 颜色硬编码 |

### 2. 主题切换不可用

- 所有 widget 在构造时把主题颜色解析进 `readonly` 私有字段，**之后再不读取主题**
- `provider.ts` 是纯变量赋值，没有变更通知机制
- `TuiApp.setTheme()` 存在，但调用后已创建的 widget 不会响应

### 3. 主题 Token 不够完整

`TuiThemeColors` 当前约 18 个 token，无法覆盖所有 widget 的语义色需求：

- Switch 的 `cross`（红）/ `check`（绿）/ `dim`（灰）— 没有 token
- Input 的 `placeholder` — 没有 token（`selectionBg`/`selectionFg` 已有）
- 缺少 `success` / `danger` / `warning` 等通用语义色

### 4. `ColorScheme<T>` 与简单属性混用

| 模式 | Widget | 合理性 |
|------|--------|--------|
| `ColorScheme<T>` 多状态 | Button, Checkbox, Radio, SelectButton, Switch | 交互组件，需要多状态 |
| 扁平属性 | Box, Text, Progress | 非交互组件，合理 |
| 混乱 | ScrollBox, Input | 没有统一的"从主题解析到 ColorScheme"工具函数，每个 widget 手写一遍 |

### 5. 双路径默认值问题

`BoxWidget` 和 `TextWidget` 等存在"工厂函数读主题，构造器不读"的不一致：

```ts
// createBox() — 读主题 ✓
export function createBox(options) {
  return new BoxWidget({...getDefaultBoxOptions(), ...options}); // getDefaultBoxOptions() 读 getTheme()
}

// new BoxWidget() — 不读主题 ✗
constructor(options) {
  this.#color = {
    colorFg: parseColor(options.colorFg ?? 0xFF_FF_FF_FF), // 硬编码
    colorBg: parseColor(options.colorBg ?? 0x00_00_00_FF), // 硬编码
  };
}
```

---

## 改进计划

### 第一阶段：补齐基础设施（P0）

#### 1.1 消除硬编码颜色，统一走主题 Token

- 将 `SwitchWidget` 的 `SWITCH_CROSS` / `SWITCH_CHECK` / `SWITCH_DIM` 等常量替换为主题 token
- 移除 `InputWidget` 构造函数中的冗余 `?? 0x...` 回退（主题已经提供了这些值）
- 将 `BoxWidget` / `TextWidget` / `ScrollBoxWidget` 构造器的硬编码默认值替换为主题读取
- 确保 `new XxxWidget()` 和 `createXxx()` 两条路径行为一致

#### 1.2 主题响应式机制

在 `provider.ts` 中增加订阅/通知：

```ts
type ThemeChangeListener = (theme: TuiTheme) => void;

const listeners: Set<ThemeChangeListener> = new Set();

export function setTheme(theme: TuiTheme): void {
  currentTheme = theme;
  for (const listener of listeners) {
    listener(theme);
  }
}

export function onThemeChange(listener: ThemeChangeListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
```

`TuiApp.setTheme()` 触发全局重渲染（标记 dirty → 下一帧重绘）。

#### 1.3 Widget 颜色延迟解析

两种策略（选其一）：

- **策略 A：渲染时解析** — `emitDrawCommands()` 时从当前主题 + 本地覆盖计算颜色，不缓存。TUI 场景 widget 数量少，每帧开销可忽略。**推荐。**
- **策略 B：双层存储** — 保留"主题 token key"和"用户自定义色"两层，主题切换时只重算依赖主题的部分。性能好但实现复杂。

### 第二阶段：完善主题 Token（P1）

#### 2.1 扩展 `TuiThemeColors`

新增语义色 token：

```ts
export type TuiThemeColors = {
  // — 现有 token 保持不变 —

  // 新增：通用语义色
  success: TuiColor;
  successMuted: TuiColor;
  danger: TuiColor;
  dangerMuted: TuiColor;
  warning: TuiColor;

  // 新增：功能色
  placeholder: TuiColor;
  indicator: TuiColor;       // switch cross/check 等指示器
};
```

#### 2.2 统一主题解析工具函数

提供 `resolveWidgetColors()` 工具，消除每个 widget 重复的主题映射代码：

```ts
type TokenOf<T> = keyof TuiThemeColors;

function resolveWidgetColors<T>(
  tokenMap: Record<keyof T, TokenOf<TuiThemeColors>>,
  overrides: Partial<T>,
): T
```

Widget 只需声明"我的 `fg` 对应 `text`、`bg` 对应 `surface`"，工具自动从当前主题解析。

### 第三阶段：生态完善（P2）

#### 3.1 Widget 级别主题覆盖

支持组件级主题变体（类似 CSS 组件级 token）：

```ts
type TuiTheme = {
  readonly name: string;
  readonly colors: TuiThemeColors;
  readonly borderStyle: TuiThemeBorderStyle;
  readonly widgets?: {        // 新增：组件级主题
    button?: Partial<ButtonThemeTokens>;
    input?: Partial<InputThemeTokens>;
    box?: Partial<BoxThemeTokens>;
    // ...
  };
};
```

#### 3.2 内置多套主题

提供 3-5 套内置主题：

- `catppuccinMocha`（暗色，已有）
- `catppuccinLatte`（亮色）
- `nord`（暗色）
- `highContrast`（高对比度）

#### 3.3 SFC 主题集成

编译器识别 `useTheme()` 在 SFC 中的响应式绑定，支持：

```vue
<script setup>
const theme = useTheme()
</script>
<template>
  <Box :colorBg="theme.colors.surface">
    <Text colorFg="text">Hello</Text>
  </Box>
</template>
```

---

## 优先级总览

| 优先级 | 工作 | 影响 |
|--------|------|------|
| **P0** | 消除硬编码颜色，统一走主题 Token | 可维护性 |
| **P0** | `setTheme` 响应式 + Widget 颜色延迟解析 | 功能完整性 |
| **P1** | 扩展 `TuiThemeColors` 语义色 Token | 可扩展性 |
| **P1** | 统一 `resolveWidgetColors` 工具函数 | 减少重复代码 |
| **P2** | Widget 级别主题覆盖 | 灵活性 |
| **P2** | 内置多套主题 | 开箱即用 |
| **P3** | SFC 主题集成 | 开发者体验 |
