# ColorTheme 系统改进路线图

## TODO

### P0 — 补齐基础设施 ✅

- [x] 消除 SwitchWidget 硬编码颜色（原 `SWITCH_CROSS` / `SWITCH_CHECK` / `SWITCH_DIM`），替换为主题 token（`danger` / `success` / `textMuted`）
- [x] 移除 InputWidget 构造函数中的冗余 `?? 0x...` 回退值
- [x] BoxWidget / TextWidget / ScrollBoxWidget 构造器默认值改用 `getTheme()`
- [x] 确保 `new XxxWidget()` 和 `createXxx()` 两条路径行为一致
- [x] `store.ts` 提供 `onThemeChange()` 订阅/通知机制
- [x] `TuiApp.setTheme()` 触发响应式更新（实际通过 listener 广播，各 widget 自行订阅重算）
- [x] Widget 颜色延迟解析：每个 widget 通过 `bindThemeToWidget()` 订阅主题变更，切换时按 token 重新解析

### P1 — 完善主题 Token ✅

- [x] `TuiThemeColors` 新增 `success` / `successMuted` / `danger` / `dangerMuted` / `warning`
- [x] `TuiThemeColors` 新增 `placeholder`（未引入 `indicator` — Switch cross→`danger`，check→`success`，dim→`textMuted`）
- [x] 实现 `resolveWidgetColors()` 统一主题解析工具函数（`theme/binding.ts`）
- [x] 13 个核心 widget 全部迁移到 `resolveWidgetColors()` + `bindThemeToWidget()`，消除重复映射代码

### P2 — 生态完善

- [ ] `TuiTheme` 增加 `widgets?` 组件级主题覆盖字段
- [x] 内置亮色主题（`rosePineDawn`）
- [x] 内置暗色主题（`tokyoNightMoon` / `tokyoNightStorm` / `rosePineMoon`）
- [x] 内置高对比度主题（`highContrast`）

### P3 — SFC 主题集成

- [ ] 编译器识别 `useTheme()` 响应式绑定
- [ ] SFC 模板支持主题 token 字符串（如 `colorFg="text"`，由编译器转成 `TuiThemedColorRef`）

---

## 现有架构

```
store.ts (全局单例)
   ├── getTheme() / setTheme() / onThemeChange()
   └── setTheme() 触发所有 listener
            │
            ├── TuiScene 订阅 → 更新背景色
            └── 每个 widget 的 bindThemeToWidget() 订阅
                     │
                     └── 主题切换 → 按 token map 重新解析 → apply() 回调写回 widget 颜色字段
```

### 核心文件

| 文件 | 职责 |
|------|------|
| `packages/core/src/theme/types.ts` | `TuiTheme` / `TuiThemeColors`（25 个 token）/ `TuiThemeBorderStyle` 类型 |
| `packages/core/src/theme/store.ts` | 全局主题单例：`getTheme()` / `setTheme()` / `onThemeChange()`，默认主题 `tokyoNightMoon` |
| `packages/core/src/theme/presets.ts` | `defineTheme()` 运行时校验 + 5 套内置主题 |
| `packages/core/src/theme/binding.ts` | `resolveWidgetColors(tokenMap)` 一次性解析；`bindThemeToWidget()` 订阅主题变更并按 token map 重算；`ThemeToken` 类型支持 `border.focused` 字符串语法 |
| `packages/core/src/theme/color-ref.ts` | `TuiThemedColorRef` 响应式颜色引用（token + OKLCH 偏移：`alpha` / `lightnessOffset` / `chromaOffset` / `hueOffset`），`colorThemed()` / `resolveThemedColor()` / `resolveThemedOverrides()` |
| `packages/core/src/theme/index.ts` | Barrel 导出 |
| `packages/core/src/widgets/color-scheme.ts` | `ColorScheme<T>` 多状态（normal/hovered/focused/disabled）颜色容器，用于交互组件 |
| `packages/core/src/app/TuiApp.ts` | `TuiApp.setTheme()` 委托 `store.setTheme()`，触发全局响应式广播 |

### 响应式机制

1. **Store 层**：`setTheme()` 同步遍历 `listeners` Set 通知所有订阅者
2. **Scene 层**：`TuiScene` 构造时订阅 `onThemeChange`，切换时重算背景色（`TuiScene.ts:29`）
3. **Widget 层**：每个 widget 在 `createXxx()` / 构造路径中调用 `bindThemeToWidget(widget, tokenMap, userOverrides, apply)`：
   - 首次用 `resolveWidgetColors(tokenMap)` 计算初始颜色
   - 订阅主题变更；切换时只重算"未被子用户显式覆盖 + 属于 themed ref"的字段
   - 订阅 cleanup 通过 `widget.addCleanup()` 注册，widget 销毁时自动解绑
4. **ColorRef 层**：`TuiThemedColorRef` 允许颜色声明为"基于某 token + OKLCH 调整"（如 `colorThemed({token: 'surface', lightnessOffset: 0.05})`），主题切换时自动重算

### Widget Token 映射

所有 13 个核心 widget 都已迁移：box、text、button、input、textarea、checkbox、switch、radio、select-button、select、scroll-box、progress、table。每个 widget 定义 `XXX_TOKEN_MAP` 常量声明字段到 token 的映射，例如 SwitchWidget：

```ts
const SWITCH_TOKEN_MAP = {
  colorCrossNormal: 'danger',
  colorCheckNormal: 'success',
  colorDimNormal: 'textMuted',
  borderStyleFocused: 'border.focused',
  // ...
} as const;
```

### 内置主题

| 主题 | 导出名 | 明暗 | 说明 |
|------|--------|------|------|
| Tokyo Night Moon | `tokyoNightMoon` | 暗 | **默认主题** |
| Tokyo Night Storm | `tokyoNightStorm` | 暗 | 更深的蓝调 |
| Rosé Pine Moon | `rosePineMoon` | 暗 | 紫调 |
| Rosé Pine Dawn | `rosePineDawn` | 亮 | 唯一亮色主题 |
| High Contrast | `highContrast` | — | 黑底高饱和，无障碍场景 |

`defineTheme()` 在运行时校验所有 25 个颜色 key 和 4 个 borderStyle key 齐全，缺失即抛 `TypeError`。

---

## 已完成的工作（原"现状问题"已全部解决）

历史记录：早期版本存在颜色硬编码、主题切换无响应、Token 不完整、`ColorScheme` 与扁平属性混用、`new` / `create()` 双路径不一致等问题，均已在 P0/P1 阶段解决。详见上方 P0/P1 勾选项。

---

## 待办计划

### P2 — Widget 级别主题覆盖

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

`bindThemeToWidget()` 需扩展为：先查 `theme.widgets[widgetName]`，再回退到全局 `colors`。

### P3 — SFC 主题集成

编译器需识别两类用法：

```vue
<script setup>
const theme = useTheme()        // 响应式绑定
</script>
<template>
  <Box :colorBg="theme.colors.surface">
    <Text colorFg="text">Hello</Text>   <!-- token 字符串 -->
  </Box>
</template>
```

- `useTheme()` 需新增 `packages/core/src/theme/use-theme.ts`（当前不存在），返回响应式 theme ref
- `colorFg="text"` 字符串字面量需由编译器转成 `colorThemed({token: 'text'})`，复用运行时已有的 `TuiThemedColorRef` 机制
- 编译器目前对 `useTheme` / token 字符串零识别（`packages/compiler/src` 无相关代码）

---

## 优先级总览

| 优先级 | 工作 | 状态 |
|--------|------|------|
| **P0** | 消除硬编码颜色，统一走主题 Token | ✅ 完成 |
| **P0** | `setTheme` 响应式 + Widget 颜色延迟解析 | ✅ 完成 |
| **P1** | 扩展 `TuiThemeColors` 语义色 Token | ✅ 完成 |
| **P1** | 统一 `resolveWidgetColors` + `bindThemeToWidget` | ✅ 完成 |
| **P2** | Widget 级别主题覆盖（`widgets?`） | ⏳ 未开始 |
| **P2** | 内置多套主题（亮/暗/高对比） | ✅ 完成 |
| **P3** | SFC 主题集成（`useTheme` + token 字符串） | ⏳ 未开始 |
