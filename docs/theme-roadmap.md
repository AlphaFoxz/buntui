# 主题系统架构

主题系统提供 25 个颜色 token + 4 个 borderStyle token 的全局响应式订阅机制。Widget 颜色通过 token map 延迟解析,主题切换时按 token 自动重算。

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
| `packages/core/src/theme/types.ts` | `TuiTheme` / `TuiThemeColors`(25 个 token)/ `TuiThemeBorderStyle` 类型 |
| `packages/core/src/theme/store.ts` | 全局主题单例:`getTheme()` / `setTheme()` / `onThemeChange()`,默认主题 `tokyoNightMoon` |
| `packages/core/src/theme/presets.ts` | `defineTheme()` 运行时校验 + 5 套内置主题 |
| `packages/core/src/theme/binding.ts` | `resolveWidgetColors(tokenMap)` 一次性解析;`bindThemeToWidget()` 订阅主题变更并按 token map 重算;`ThemeToken` 类型支持 `border.focused` 字符串语法 |
| `packages/core/src/theme/color-ref.ts` | `TuiThemedColorRef` 响应式颜色引用(token + OKLCH 偏移:`alpha` / `lightnessOffset` / `chromaOffset` / `hueOffset`),`colorThemed()` / `resolveThemedColor()` / `resolveThemedOverrides()` |
| `packages/core/src/theme/index.ts` | Barrel 导出 |
| `packages/core/src/widgets/color-scheme.ts` | `ColorScheme<T>` 多状态(normal/hovered/focused/disabled)颜色容器,用于交互组件 |
| `packages/core/src/app/TuiApp.ts` | `TuiApp.setTheme()` 委托 `store.setTheme()`,触发全局响应式广播 |

### 响应式机制

1. **Store 层**:`setTheme()` 同步遍历 `listeners` Set 通知所有订阅者
2. **Scene 层**:`TuiScene` 构造时订阅 `onThemeChange`,切换时重算背景色(`TuiScene.ts:29`)
3. **Widget 层**:每个 widget 在 `createXxx()` / 构造路径中调用 `bindThemeToWidget(widget, tokenMap, userOverrides, apply)`:
   - 首次用 `resolveWidgetColors(tokenMap)` 计算初始颜色
   - 订阅主题变更;切换时只重算"未被用户显式覆盖 + 属于 themed ref"的字段
   - 订阅 cleanup 通过 `widget.addCleanup()` 注册,widget 销毁时自动解绑
4. **ColorRef 层**:`TuiThemedColorRef` 允许颜色声明为"基于某 token + OKLCH 调整"(如 `colorThemed({token: 'surface', lightnessOffset: 0.05})`),主题切换时自动重算

### Widget Token 映射

所有 13 个核心 widget 都已迁移:box、text、button、input、textarea、checkbox、switch、radio、select-button、select、scroll-box、progress、table。每个 widget 定义 `XXX_TOKEN_MAP` 常量声明字段到 token 的映射,例如 SwitchWidget:

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
| High Contrast | `highContrast` | — | 黑底高饱和,无障碍场景 |

`defineTheme()` 在运行时校验所有 25 个颜色 key 和 4 个 borderStyle key 齐全,缺失即抛 `TypeError`。

## 待实现的设计

### Widget 级主题覆盖 — #42

支持组件级主题变体(类似 CSS 组件级 token):

```ts
type TuiTheme = {
  readonly name: string;
  readonly colors: TuiThemeColors;
  readonly borderStyle: TuiThemeBorderStyle;
  readonly widgets?: {        // 新增:组件级主题
    button?: Partial<ButtonThemeTokens>;
    input?: Partial<InputThemeTokens>;
    box?: Partial<BoxThemeTokens>;
    // ...
  };
};
```

`bindThemeToWidget()` 需扩展为:先查 `theme.widgets[widgetName]`,再回退到全局 `colors`。

### SFC 主题集成 — #47

编译器需识别两类用法:

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

- `useTheme()` 需新增 `packages/core/src/theme/use-theme.ts`(当前不存在),返回响应式 theme ref
- `colorFg="text"` 字符串字面量需由编译器转成 `colorThemed({token: 'text'})`,复用运行时已有的 `TuiThemedColorRef` 机制
- 编译器目前对 `useTheme` / token 字符串零识别(`packages/compiler/src` 无相关代码)
