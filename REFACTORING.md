# buntui 重构分析报告

> 基于 2026-10 对 monorepo 核心代码的通读诊断。按问题严重度排序,重构路线按收益/风险排序,每步独立可交付、可测试。

## 一、问题诊断(按严重度)

### 1. Input/Textarea 重复编辑核心(最严重)

`packages/core/src/widgets/input/InputWidget.ts`(1226 行)与 `packages/core/src/widgets/textarea/TextareaWidget.ts`(1570 行)存在大规模重复:

- **模块级工具函数逐字相同**:`charIndexAtColumn`、`charCategory` + CJK 分类、`CHAR_CATEGORY_*` 常量
- **Token map**:`INPUT_TOKEN_MAP` / `TEXTAREA_TOKEN_MAP` 几乎相同(仅后者多 scrollbar 两项)
- **方法结构相同**:选择区(`#getSelectionRange` / `#deleteSelection` / `setSelectionRange` / `select` / `getSelection`)、撤销栈(`#pushUndo` / `#handleUndo` / `#handleRedo` + `undoStack` / `redoStack`)、剪贴板(`#handleCopy` / `#handleCut` / `#handlePaste`)、词移动(`#wordRangeAt` / `#handleWordLeft/Right/Backspace/Delete`)、`#handleCtrlKey` 大 switch、`#updateSelectionForMovement`、`#cycleCursorMode`、`#clampScrollOffset`、`#posFromMouse`
- **注意**:状态结构并非完全一致——Input 的 undo 栈存单光标 + anchor,Textarea 存多行 `TextPosition(line, col)` + `selectionAnchor`,提取时需参数化

任何编辑行为 bug(如 CJK 宽度、undo 语义)都要改两处,极易漂移。

### 2. 主题/颜色样板在每个控件重复

14 个控件各自重复 `resolveWidgetColors(TOKEN_MAP)` + `initTokenMap` + `bindThemeToWidget(...)` + `applyColorSchemeUpdates` + `resolveColorState` 五件套(约 5 处/控件),是可抽成基类或 mixin 的纯样板。`updateColor` / `updateBorder` 也是各类自行定义(非继承),结构雷同。

### 3. 四胞胎选择控件

`SelectButtonWidget`(333 行)/ `RadioGroupWidget`(272 行)/ `CheckboxWidget`(248 行)/ `SwitchWidget`(268 行)共享大量边框/焦点/hover/disabled 着色与 `updateColor` / `updateBorder` 逻辑,仅视觉渲染不同。

### 4. 双后端事件层重复

`HtmlBackend`(592 行,浏览器/WASM)与 `NativeBackend`(142 行 FFI)各自实现事件解码、指针、生命周期。

> 注:`packages/extensions/src/utils/color.ts`(`lerpRgba` / `buildTrailGradient`,颜色插值)与 `packages/core/src/utils/color.ts`(`parseColor`,颜色解析)是**互补关系而非平行实现**,且前者已依赖 core 的 `withAlpha`,不构成重复问题。

### 5. Compiler codegen 巨石

`packages/compiler/src/template/codegen.ts`(1037 行):

- `generateList` / `generateKeyedList` / `generateStaticList` 三条近似路径并存
- `hasDynamicBindings` / `hasComponentCalls` / `hasDynamicComponentProps` 三个重复模式的树遍历
- 可统一为一个 visitor + 策略
- **风险**:compiler 几乎没有单元测试,拆分前必须先补快照测试

### 6. Zig 输入层归一化未下沉(结构性重复,需留意)

`posix_listener.zig`(1056 行,其中约 200 行为内联测试)与 `windows_listener.zig`(656 行)的平台差异是本质的,但事件归一化(键名、修饰键、鼠标编码)部分逻辑两边各写一遍,应下沉到共享模块。绝对重复量比行数暗示的小,收益中等。

## 二、根因:缺失的抽象层

对照主流 TUI/编辑器框架,本库渲染侧的分层(DrawList 命令缓冲、Scene z-index、事件总线)是健康的;上述问题全部集中在渲染之上的**语义层**,每层缺失正好对应一个问题:

| 症状(见"一") | 缺失的抽象层 | 主流先例 |
|---|---|---|
| 1. Input/Textarea 重复编辑核心 | Headless 编辑模型(TextBuffer + Transaction) | CodeMirror 6 的 `EditorState`/`Transaction`;Qt 的 `QTextDocument` + `QTextCursor`;Monaco 的 `TextModel` + `ICommand` |
| 2. 主题五件套样板 | 主题设施下沉基类(ThemedWidget 契约) | Qt palette 父级继承、绘制时查询;ratatui Style 渲染时合并 |
| 3. 四胞胎选择控件 | AbstractButton/Toggleable 中间层 | Qt `QAbstractButton`(子类只写 paintEvent);Flutter `Toggleable` mixin |
| 4. 双后端事件层重复 / 6. Zig 归一化重复 | 输入解码分层(reader / decoder 分离) | crossterm、tcell:平台 reader 只产原始字节,共享纯函数做归一化 |
| 5. codegen 三遍历 | 单次分析 pass(IR metadata) | 编译器标准做法:transform 单 visitor 收集元数据,codegen 消费摘要 |
| (暂缓项)键盘单体 switch | 命令/键表层(KeyStroke → Command 查表) | readline keymap、Vim mappings、Qt `QAction` + `QKeySequence` |

**元观察**:每个控件类把"模型状态 + 呈现 + 输入处理"焊在一个类里(God-widget 模式)。呈现已被 DrawList 接管所以没有病灶;模型与输入处理从未拆分,所以编辑核心、命令分发各自膨胀。`InteractiveWidget.handleKey → dispatchKeyEvent → handleActiveKey` 已是模板方法模式的雏形,"命令层"只差半步。

**已有良好基础**(不需推倒):DrawList 管线;`InteractiveWidget` 交互状态机(focus/hover/disabled/tabIndex + disabled 事件阻断);`resolveColorState` 绘制时拉取(方向与 ratatui/CSS 一致,问题只在管道样板);全帧重绘(合理选择,非缺失)。

### 对未来新增代码的约束

重构完成后,以下约束用于防止问题复发:

- 新增编辑类控件**必须**复用 `widgets/text-editing/` 的模型层,禁止自带 undo/selection/剪贴板/词移动实现
- 新增可切换类控件(选中/未选中语义)**必须**继承四胞胎公共基类(或 Toggleable mixin),禁止自带 hover/focus/disabled 着色与焦点边框
- 新增控件**不得**自行拼接主题管道,必须走基类 token map 契约(步骤 2 的产物)
- Zig 新增平台 listener 只实现 reader 部分,事件归一化必须走 `input/normalize.zig`
- compiler 新增树遍历前,先确认能否并入 `analyzeTree()` 单次分析

## 三、重构路线(按收益/风险排序)

每个步骤对应补齐"二、根因"中的一层;顺序即依赖顺序——模型层最深先补,命令层最投机故暂缓。

### 步骤 1:抽公共编辑核心(收益最大)

新建 `packages/core/src/widgets/text-editing/`(或 `shared/editor.ts`),提取:

| 模块 | 内容 |
|---|---|
| `text-measure.ts` | `charIndexAtColumn`、`charCategory`、CJK 宽度分类 |
| `SelectionState` | range 获取/删除/设置 |
| `UndoRedoStack<T>` | pushUndo / handleUndo / handleRedo(泛型化,兼容单光标与多行 TextPosition 两种状态) |
| `clipboard-edit-ops.ts` | copy / cut / paste |
| 词移动 | `wordRangeAt` / `wordLeft/Right` / `wordBackspace/Delete` |

Input / Textarea 只保留各自差异:Input 的密码掩码、数字步进;Textarea 的软换行、visual lines、双轴滚动。**预期净减 ~400-600 行。**

- [x] 提取 `text-measure.ts`(逐字复制部分,零风险)
- [x] 提取 `UndoRedoStack<T>`,参数化 Input/Textarea 两种状态结构
- [x] 提取 SelectionState 与 clipboard-edit-ops
- [x] 提取词移动逻辑
- [x] `bun test` 全绿后完成本步

### 步骤 2:控件基类吸收主题样板

在 `InteractiveWidget`(或新 `ThemedWidget` 基类)中内置 token map 声明 + `bindThemeToWidget` / `applyColorSchemeUpdates` 生命周期,14 个控件各删 ~5 处样板。

- [x] 设计基类 API(子类仅声明 token map 与 color 状态)
- [x] 迁移 2 个控件试点(建议先 Button + Progress)
- [x] 迁移其余 12 个控件,每迁一个跑 `bun test`

  > 实施说明:新增 `widgets/ThemedWidget.ts`(继承 InteractiveWidget),以 `static TOKEN_MAP` 声明 + 构造函数内自动 `initTokenMap`/`bindThemeToWidget`/构建 ColorScheme,子类通过 `colors`/`resolvedToken()` 读取、`onThemeColorsUpdated` 钩子处理额外颜色。11 个 InteractiveWidget 系控件全部迁移(Button/Progress/Switch/Checkbox/RadioGroup/SelectButton/Input/Textarea/ScrollBox/Select/Table);Box 与 Text 继承 `TuiWidgetEntity` 层级不同,且主题管道为定制实现(内联 theme 回退、非主题 colorShadow),不纳入本步,保留现状。

### 步骤 3:合并四胞胎公共部分

抽 `ToggleLikeWidget` 或 `selectable` mixin,统一 hover/focus/disabled 着色与 `updateColor` / `updateBorder`,子类只写 `render()`。注意四个控件各仅 210-330 行,避免过度抽象——只提取确凿相同的部分。

- [ ] 比对四份源码,列出确凿相同的逻辑清单
- [ ] 抽公共基类/mixin,子类保留各自渲染
- [ ] 跑四个控件的现有测试验证

### 步骤 4:codegen 拆分

- [x] **前置:为 codegen 补快照测试**(覆盖 static / keyed / diff 三路径、条件、props、动态组件),作为自动化安全网
- [x] 拆出 `codegen/list.ts`:以 keyed diff 为唯一实现,static 为退化情形
- [x] 拆出 `codegen/conditions.ts`、`codegen/props.ts`
- [x] 三个 `hasXxx` 树遍历合并为一次 `analyzeTree()` visitor
- [x] playground(`bun run dev demo`)+ WASM demo 手工验证

  > 实施说明:`template/codegen.ts`(1037 行)拆为 `template/codegen/` 目录——`index.ts`(顶层 generate 与 imports 装配,149 行)、`nodes.ts`(节点分发 + widget/动态组件)、`conditions.ts`(v-if/v-show 树机制)、`list.ts`(static/keyed 双路径,共享 `buildLoopHeader` 消除三处近似循环头;`emitNode` 参数注入消除循环依赖)、`props.ts`(prop/效果/组件 props 助手)、`analyze.ts`(单次 `analyzeTree()` visitor,逐节点语义与原三个 hasXxx 等价)。17 个输出快照锁定行为,拆分前后字节级一致。消费方 `compile.ts`/`index.ts` 的 `./template/codegen` 导入路径不变(解析到目录 index)。

### 步骤 5:后端共性审计

审计 HtmlBackend 与 NativeBackend 的事件归一化,把共性(指针坐标、事件字段解码)提到 `TuiBackend` 基类或独立模块。两者技术栈本质不同(FFI vs DOM),只提取确凿共性,不强求合并。

- [x] 列出两后端的事件解码/指针逻辑对照表
- [x] 提取共性到共享模块(仅限确凿重复部分)

  > 实施说明:审计结论是不建 `TuiBackend` 基类——两后端仅接口签名相同,方法实现(WASM exports vs FFI symbols vs DOM)零共性,基类只会是空壳。确凿重复只有两块:①payload 协议知识(`MOD_*`/`FLAG_*` 常量与 `HtmlBackend` 各定义一份,序列化函数与 `events/types.ts` 解码器是同一协议的两端)→ 移入新建 `events/serialize.ts`(`serializeKeyboardEvent`/`serializeMouseEvent`/`serializeResizeEvent`/`serializeWheelEvent`/`serializeCtrlV`),常量从 `types.ts` 改为导出,单一来源;②NativeBackend 私有的 `schemaRegistry` 与 `types.ts` 的 `TuiEventMap` 是同一知识 → 下沉为 `types.ts` 导出的 `EVENT_SCHEMA_REGISTRY`。`TerminalMouseEvent`/`DomKeyboardEvent` 类型随序列化函数迁至 `serialize.ts`,`HtmlBackend` re-export 保持 API 兼容。HTML 独有逻辑(SGR 解析、50ms 去重、touch 手势、剪贴板)与 FFI 独有逻辑(poll/commit 轮询)原样保留,不提取。已有字节级 parity 测试改挂新路径,并新增 `EVENT_SCHEMA_REGISTRY` 覆盖测试;`bun run test:ts` 全绿(2491 pass),`tsc` 编译通过。

### 步骤 6:Zig 事件归一化下沉

新建 `packages/native/src/input/normalize.zig`,posix/windows listener 共用键名/修饰键/鼠标编码。纯结构性,不改行为。

- [x] 梳理两 listener 中归一化逻辑的重叠清单
- [x] 提取 `normalize.zig` 并改造两侧调用
- [x] `bun run test:zig` 全绿后完成本步

  > 实施说明:下沉清单——`buildModifiers`、4 个 `emit*Event`(含 `binary_buf`)、`parseSgrMouseSequence`(~90 行逐字相同)、`parseSs3Sequence`、`parseBufferedSequence` 分派、CSI 修饰参数解码(posix 闭包与 windows 内联 switch 语义一致,统一为 `decodeCsiModifiers`)、CSI final/`~`param1 键表(posix 硬编码键名与 windows VK→mapper 名字逐一核对一致,统一为 `CsiKey` 枚举 + `csiKeyFromFinalChar`/`csiKeyFromP1`/`csiKeyName`,windows 侧 VK 映射 `csiKeyToVirtualKey` 留在 `windows_mapper` 以保持 normalize 平台无关)、`keyCodeToKeyName`(posix 全量版;`windows_mapper.unicodeToKeyName` 在其调用域 `unicode_char < 32 or 0x7F` 内行为等价,改为转调)、`InputState` 共享枚举(posix 扩展 `Utf8Sequence`)。平台 reader 本体保留:posix 的 UTF-8 状态机/SIGWINCH resize、windows 的 VK 码/物理键查询/Console resize。两个 listener 各删 ~200-330 行重复,`normalize.zig` 538 行(含 12 个新测试,覆盖键名/修饰键/CSI 表/SS3/SGR press-release-drag-wheel)。验证:`zig test` 167 pass;windows-gnu 与 aarch64-macos 交叉编译通过(共享枚举使 windows `processEvent` 补 `Utf8Sequence` 空分支,Console API 路径不会进入该状态,已注释);`bun run --cwd ./packages/native build`(本机 release + wasm32-wasi)成功,`bun run test` 全量 2491 TS 测试全绿。

## 四、暂缓 / 不建议动

- **键盘命令表(keymap)替代 switch** — 暂缓。当前没有可配置 keybinding / IME 的实际需求,查表化收益是投机性的,而 `handleKey`(repeat、修饰键组合、光标模式语义)查表化的回归风险实在。待需求出现再做。
- **extensions 颜色工具下沉 core** — 暂缓。`lerpRgba` / `buildTrailGradient` 目前仅 extensions 一个消费者,等出现第二个消费者再下沉。
- **posix/windows listener 的平台分支本体**、`browser` / `native` 双 platform 字段切换——是架构既定的双目标支持,只需减少内部重复,不必合并。
- **TuiWidgetEntity**(约 510 行)职责偏多但被全部控件依赖,建议单独排期,不在本轮。

## 五、回归保障

- 每步完成后运行 `bun run test`(zig + ts)
- 全部核心控件(含 Input/Textarea/四胞胎)都有现有测试,步骤 1-3 的安全网完整
- 步骤 4 以新增 codegen 快照测试为安全网,playground + WASM demo 手工验证兜底
- 步骤 6 以 `bun run test:zig` 为安全网
