# buntui 重构分析报告

> 基于 2024 年对 monorepo 核心代码的通读诊断。按问题严重度排序,重构路线按收益/风险排序,每步独立可交付、可测试。

## 一、问题诊断(按严重度)

### 1. Input/Textarea 复制 ~700 行编辑核心(最严重)

`packages/core/src/widgets/input/InputWidget.ts`(1226 行)与 `packages/core/src/widgets/textarea/TextareaWidget.ts`(1570 行)存在大规模逐字复制:

- **模块级工具函数**:`charIndexAtColumn`、`charCategory` + CJK 分类、`CHAR_CATEGORY_*` 常量完全相同
- **Token map**:`INPUT_TOKEN_MAP` / `TEXTAREA_TOKEN_MAP` 几乎相同(仅后者多 scrollbar 两项)
- **选择区**:`#getSelectionRange` / `#deleteSelection` / `setSelectionRange` / `select` / `getSelection`
- **撤销栈**:`#pushUndo` / `#handleUndo` / `#handleRedo` 及 `undoStack` / `redoStack` 数据结构
- **剪贴板**:`#handleCopy` / `#handleCut` / `#handlePaste`
- **词移动**:`#wordRangeAt` / `#handleWordLeft/Right` / `#handleWordBackspace/Delete`
- **其他**:`#handleCtrlKey` 大 switch、`#updateSelectionForMovement`、`#cycleCursorMode`、`#clampScrollOffset`、`#posFromMouse`

任何编辑行为 bug(如 CJK 宽度、undo 语义)都要改两处,极易漂移。

### 2. 键盘处理单体 switch

每个可编辑控件用巨型 `handleKey` + `#handleCtrlKey` switch,新增按键/修饰键组合要侵入每个控件,难以扩展(如未来支持可配置 keybinding 或 IME)。

### 3. 主题/颜色样板在每个控件重复

14 个控件各自重复 `resolveWidgetColors(TOKEN_MAP)` + `bindThemeToWidget(...)` + `applyColorSchemeUpdates` + `resolveColorState` 五件套(约 5 处/控件),是可抽成基类或 mixin 的纯样板。

### 4. 四胞胎选择控件

`SelectButtonWidget`(333 行)/ `RadioGroupWidget`(272 行)/ `CheckboxWidget`(248 行)/ `SwitchWidget`(268 行)共享大量边框/焦点/hover/disabled 着色与 `updateColor` / `updateBorder` 逻辑,仅视觉渲染不同。

### 5. 双后端与颜色工具平行实现

- `HtmlBackend`(592 行,浏览器/WASM)与 `NativeBackend`(142 行 FFI)各自实现事件解码、指针、生命周期
- `packages/extensions/src/utils/color.ts` 与 `packages/core/src/utils/color.ts` 平行的颜色工具

### 6. Compiler codegen 巨石

`packages/compiler/src/template/codegen.ts`(1037 行):

- `generateList` / `generateKeyedList` / `generateStaticList` 三条近似路径并存
- `hasDynamicBindings` / `hasComponentCalls` / `hasDynamicComponentProps` 三个重复模式的树遍历
- 可统一为一个 visitor + 策略

### 7. Zig 输入层归一化未下沉(结构性重复,需留意)

`posix_listener.zig`(1038 行)与 `windows_listener.zig`(656 行)的平台差异是本质的,但事件归一化(键名、修饰键、鼠标编码)部分逻辑两边各写一遍,应下沉到共享模块。

## 二、重构路线(按收益/风险排序)

### 步骤 1:抽公共编辑核心(收益最大)

新建 `packages/core/src/widgets/text-editing/`(或 `shared/editor.ts`),提取:

| 模块 | 内容 |
|---|---|
| `text-measure.ts` | `charIndexAtColumn`、`charCategory`、CJK 宽度分类 |
| `SelectionState` | range 获取/删除/设置 |
| `UndoRedoStack<T>` | pushUndo / handleUndo / handleRedo |
| `clipboard-edit-ops.ts` | copy / cut / paste |
| 词移动 | `wordRangeAt` / `wordLeft/Right` / `wordBackspace/Delete` |

Input / Textarea 只保留各自差异:Input 的密码掩码、数字步进;Textarea 的软换行、visual lines、双轴滚动。**预期净减 ~600-800 行。**

### 步骤 2:键盘命令表替代 switch

定义 `keymap: Record<key combo, handler>`(可按控件覆盖/合并),`#handleCtrlKey` 收敛为查表;为未来 keybinding 主题留扩展点。

### 步骤 3:控件基类吸收主题样板

在 `InteractiveWidget`(或新 `ThemedWidget` 基类)中内置 token map 声明 + `bindThemeToWidget` / `applyColorSchemeUpdates` 生命周期,14 个控件各删 ~5 处样板。

### 步骤 4:合并四胞胎公共部分

抽 `ToggleLikeWidget` 或 `selectable` mixin,统一 hover/focus/disabled 着色与 `updateColor` / `updateBorder`,子类只写 `render()`。

### 步骤 5:统一颜色工具与后端共性

- `extensions/utils/color.ts` 改为 re-export core 的 `utils/color.ts`
- 审计 HtmlBackend 与 NativeBackend 的事件归一化,把共性(指针坐标、事件字段解码)提到 `TuiBackend` 基类或独立模块

### 步骤 6:codegen 拆分

把 `codegen.ts` 按职责拆分:

- `codegen/list.ts`:static/keyed/diff 三路径合一,以 keyed diff 为唯一实现,static 为退化情形
- `codegen/conditions.ts`
- `codegen/props.ts`

三个 `hasXxx` 树遍历合并为一次 `analyzeTree()` visitor。

### 步骤 7:Zig 事件归一化下沉

新建 `packages/native/src/input/normalize.zig`,posix/windows listener 共用键名/修饰键/鼠标编码。纯结构性,不改行为。

## 三、不建议动的部分

- **posix/windows listener 的平台分支本体**、`browser` / `native` 双 platform 字段切换——是架构既定的双目标支持,只需减少内部重复,不必合并。
- **TuiWidgetEntity**(510 行)职责偏多但被全部控件依赖,建议单独排期,不在本轮。

## 四、回归保障

- 每步完成后运行 `bun run test`(zig + ts)
- Input / Textarea 现有测试作为步骤 1 的安全网
- 步骤 6 用 playground(`bun run dev demo`)+ WASM demo 手工验证
