# Widget Feature Gaps vs HTML Counterparts

Baseline: each core widget is compared against its closest HTML equivalent to identify missing features that users would reasonably expect.

## Design Issues

### ProgressBar should not be focusable

HTML `<progress>` is not interactive. Currently `ProgressBarWidget` extends `InteractiveWidget`, making it part of the Tab order with no meaningful keyboard behavior (`handleActiveKey` is a no-op). It should likely extend `TuiWidgetEntity` directly or have `acceptsFocus = false` by default.

**Affected file:** `packages/core/src/widgets/progress-bar/ProgressBarWidget.ts`

---

## P1 — Core Interaction Gaps

### Input: Clipboard support

Missing Ctrl+C (copy), Ctrl+V (paste), Ctrl+X (cut). These are fundamental text editing operations.

**Affected file:** `packages/core/src/widgets/input/InputWidget.ts`

### Input: Undo/Redo

Missing Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo). Standard text editing expectation.

**Affected file:** `packages/core/src/widgets/input/InputWidget.ts`

### Input: Double-click to select word, triple-click to select all

HTML `<input>` supports double-click to select the word under cursor and triple-click to select all text.

**Affected file:** `packages/core/src/widgets/input/InputWidget.ts`

### Input: `select()` / `setSelectionRange()` API

HTML inputs expose `select()` (select all) and `setSelectionRange(start, end, direction)` as imperative methods. Currently only Ctrl+A provides select-all, and there is no way to programmatically set a selection range.

**Affected file:** `packages/core/src/widgets/input/InputWidget.ts`

### RadioGroup: Home/End keys

ArrowUp/Down wrap around, but Home/End to jump to first/last option are missing. Standard arrow-key navigation complement.

**Affected file:** `packages/core/src/widgets/radio/RadioGroupWidget.ts`

### SelectButton: Home/End keys

Same as RadioGroup — ArrowLeft/Right cycle, but Home/End for first/last are missing.

**Affected file:** `packages/core/src/widgets/select-button/SelectButtonWidget.ts`

### ScrollBox: `scroll` event dispatch

No event is fired when scroll offset changes. External code cannot react to scroll position changes.

**Affected file:** `packages/core/src/widgets/scroll-box/ScrollBoxWidget.ts`

### ScrollBox: `scrollIntoView(child)` method

No way to scroll a specific child into the visible viewport. Essential for programmatic navigation (e.g., "scroll to active item").

**Affected file:** `packages/core/src/widgets/scroll-box/ScrollBoxWidget.ts`

---

## P2 — UX Polish

### Input: Password mode

Missing `type="password"` equivalent where characters are masked (e.g., displayed as `•` or `*`).

**Affected file:** `packages/core/src/widgets/input/InputWidget.ts`

### Checkbox: Indeterminate state

Missing a third visual state (`[-]` or similar) representing "neither checked nor unchecked." HTML exposes this via `element.indeterminate = true`.

**Affected file:** `packages/core/src/widgets/checkbox/CheckboxWidget.ts`

### ProgressBar: Indeterminate animation

When value is unknown, HTML `<progress>` shows an animated sliding bar. Currently ProgressBar has no such state.

**Affected file:** `packages/core/src/widgets/progress-bar/ProgressBarWidget.ts`

### ScrollBox: Horizontal scrolling

Currently vertical-only. Missing `overflow-x` equivalent for horizontal scroll.

**Affected file:** `packages/core/src/widgets/scroll-box/ScrollBoxWidget.ts`

### ScrollBox: Scrollbar thumb drag

Clicking/dragging the scrollbar thumb should jump/scroll to the corresponding position. Currently only mouse wheel and content-area drag-scroll work.

**Affected file:** `packages/core/src/widgets/scroll-box/ScrollBoxWidget.ts`

---

## P3 — Ecosystem / Infrastructure

### All widgets: Form participation

No widget has `name`, `form`, or submission `value` attributes. TUI apps lack native form submission, so a form abstraction layer would need to be designed first.

### All widgets: ARIA attributes

Terminal UIs have no DOM, but screen reader bridges need role/label/state data. Widgets should carry semantic metadata (e.g., `role="button"`, `aria-checked`, `aria-valuenow`).

### All widgets: `autofocus`

No widget supports automatically focusing on mount. Would require a scene-level "auto-focus the first autofocus widget" mechanism.

### All widgets: `focus-visible`

No distinction between keyboard-triggered focus and click-triggered focus. HTML solves this with `:focus-visible` — keyboard focus shows a ring, click focus does not.

### All widgets: `accesskey`

No global keyboard shortcut attribute. Would need a scene-level shortcut registry.

### Input: `placeholder` style customization

Placeholder color is hardcoded to `0x6C_70_86_FF`. Should be configurable via options.
