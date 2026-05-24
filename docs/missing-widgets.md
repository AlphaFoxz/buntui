# Missing Core Widgets

Widgets that HTML provides and TUI applications concretely need, but are not yet implemented.

## Required — TUI apps cannot be built without these

### Select — `<select>`

Dropdown list for picking one option from many. Every settings UI, every form needs this. As fundamental as Input and Button.

---

## Important — Significant UX improvement

### Slider — `<input type="range">`

Horizontal slider for numeric value input. Settings panels for volume, opacity, speed, etc.

### Dialog — `<dialog>`

Modal overlay for confirmations, alerts, and input prompts. "Are you sure?" / "Enter a value:" dialogs.

### Tooltip — `title` attribute

Hover-triggered informational popup. Help text, keyboard shortcut hints, descriptions.

### Details — `<details>` / `<summary>`

Collapsible section with summary header. Settings panels, debug info grouping, FAQ lists.

### Link — `<a>`

Clickable text that triggers navigation or action. Help text, documentation links, breadcrumb navigation.

---

## Reference: Currently Implemented

| Widget | HTML Counterpart | Status |
|---|---|---|
| Box | `<div>` | Done |
| Text | `<span>` | Done |
| Button | `<button>` | Done |
| Input (text) | `<input type="text">` | Done |
| Input (password) | `<input type="password">` | Done |
| Input (number) | `<input type="number">` | Done |
| Textarea | `<textarea>` | Done |
| Table | `<table>` | Done |
| Checkbox | `<input type="checkbox">` | Done |
| Switch | toggle switch | Done |
| RadioGroup | `<input type="radio">` | Done |
| SelectButton | segmented control | Done |
| Progress | `<progress>` | Done |
| ScrollBox | `overflow: auto` | Done |
