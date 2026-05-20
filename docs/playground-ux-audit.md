# Playground UX Audit

Last updated: 2026-05-20

## 严重 Bug

### Q-1: `q` 键在 Input 聚焦时仍会退出程序

`TuiApp.start()` 全局注册了 `q`/`Q` 键的退出监听（`packages/core/src/app/TuiApp.ts:81`），无论当前焦点在哪个 widget 上都会触发。当用户在 InputWidget 中输入字母 `q` 时，字符会被插入文本框，**同时**程序直接退出。

**当前代码**：

```ts
// TuiApp.ts start()
EVENT_BUS.on(TuiEventType.KeyboardEvent, data => {
  if (data.key === 'q' || data.key === 'Q') {
    setTimeout(() => { this.stop(); });
  }
});
```

**修复方向**：当存在可聚焦的文本输入 widget 时，跳过全局 `q` 退出；或改为 `Ctrl+C` / `Escape` 等不会与文本输入冲突的快捷键。

---

### Q-2: HMR 编译错误无视觉反馈 ✅ 已修复

`.vue` 文件编译失败时，`dev-server.ts` 调用 `onError(error)`，而 `dev.ts` 中的回调只是 `console.error('[HMR]', error)`。由于 TuiApp 拦截了 `console.error`（重定向到日志文件和 pending buffer），**屏幕上没有任何变化**。用户看到的是上一次成功编译的状态，无法感知编译失败。

**修复方案**：
- 新增 `@buntui/extensions/hmr-error-overlay` 扩展，提供 `mountHmrErrorOverlay(scene, error)` 函数
- `dev.ts` 的 `onError` 回调挂载全屏错误覆盖层（双线边框、红色标题、错误消息 + stack trace）
- `onClear`/`onReload` 回调调用 `dismiss()` 移除覆盖层
- dev-server 增加 `needsFullReload` 标记，编译失败后强制下次走 `fullReload` 重建完整状态，避免增量编译引用已删除的临时文件

---

## 关键缺失

### Q-3: 无 Tab 键盘焦点导航

`FocusManager`（`packages/core/src/app/FocusManager.ts`）只支持鼠标点击聚焦和编程式聚焦，没有焦点链（focus chain）的概念。用户无法通过 `Tab`/`Shift+Tab` 在组件间切换焦点。对于一个 TUI 框架来说，纯键盘导航是核心功能。

**修复方向**：
- 为每个 scene 维护一个按 mount 顺序排列的 focusable widget 列表
- `Tab` 移动到下一个，`Shift+Tab` 移动到上一个
- 考虑 `tabIndex` 属性支持自定义焦点顺序

---

### Q-4: 无帮助提示或状态栏

用户首次运行 `bun run dev` 时直接进入 demo 界面，没有任何操作指引：
- 不知道 `q` 退出
- 不知道 tab 可以拖拽
- 不知道方向键可以切换 SelectButton
- 不知道 Logger 面板可以点击展开

**修复方向**：在底部添加一个状态栏（类似 vim 的 cmdline），显示当前终端尺寸、焦点 widget、可用快捷键提示。

---

## 开发体验问题

### Q-5: HMR 完全丢失状态

每次文件保存触发 HMR 时，`onClear()` 调用 `scene.clearWidgets()` 销毁所有 widget，然后 `onReload()` 重新执行 `setup()` 从零创建。所有用户输入状态（文本框内容、勾选状态、滚动位置、计时器）全部丢失。

这在迭代开发交互组件时体验很差——每次保存都要重新操作一遍才能回到测试状态。

**修复方向**：
- 短期：在 `onClear` 前序列化关键状态到 `ref`，reload 后恢复
- 长期：实现组件级热替换（只替换变更的组件，保留未变更组件的状态）

---

### Q-6: 切换 demo 入口需手动改代码

`main.ts` 中 `VideoPlayer.vue` 的入口被注释掉了，切换 demo 需要手动编辑代码：

```ts
export const ENTRY = 'App.vue';
// export const ENTRY = 'VideoPlayer.vue';
```

**修复方向**：支持命令行参数选择 demo 入口，如 `bun run dev --entry VideoPlayer.vue`。

---

### Q-7: `console.log` 双重劫持 — 已移除劫持机制，待重新设计

`TuiApp.start()` 拦截了 `console.log`/`error`/`warn`，Logger 扩展又再次劫持了 `console.log`。结果是 Logger 的劫持完全覆盖了 TuiApp 的拦截，导致日志不再写入磁盘文件，`console.error`（HMR 错误走这个）也不被 Logger 捕获。

**当前状态**：已移除 Logger 组件的 `hijack` 选项和 `hijackConsole()`/`restoreConsole()` 方法。Logger 现在是一个纯粹的日志展示面板，只通过 `log()` 方法手动添加消息。

**待定方案**：Logger 应改为读取磁盘上的日志文件（由 TuiApp 的 `LOGGER` 写入），具体实现方式（`fs.watch` + 增量读取 / LOGGER 观察者模式）后续再定。

---

## 次要问题

### Q-8: 无退出确认

按 `q` 立即退出，没有确认提示。误触即丢失整个会话。

### Q-9: demo 中硬编码颜色

所有 demo 组件使用内联 `rgba(...)` 颜色字符串，没有使用主题系统的 color token。切换主题不会影响 playground 的外观。

### Q-10: ScrollBox demo 只有静态文本

`ScrollBoxDemo.vue` 只展示了纯文本滚动，没有演示滚动区域内的交互组件（按钮、输入框等），这是 ScrollBox 的重要使用场景。

### Q-11: debugMode 无可见效果

`main.ts` 中设置了 `debugMode: true`，但这只启用了键盘/鼠标事件的日志写入，屏幕上没有任何 debug 信息显示。用户感知不到这个模式的存在。

### Q-12: Logger 面板可能渲染到屏幕外

Logger 的面板位置相对于其浮动按钮。如果按钮被拖拽到屏幕底部附近，面板可能超出终端可见区域。
