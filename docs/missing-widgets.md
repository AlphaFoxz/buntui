# Missing Core Widgets

Widgets that HTML provides and TUI applications concretely need, but are not yet implemented.

## Required — TUI apps cannot be built without these

### Select — `<select>`

Dropdown list for picking one option from many. Every settings UI, every form needs this. As fundamental as Input and Button.

### Textarea — `<textarea>`

Multi-line text editing. Chat input, config editing, log viewing, note-taking — all require multi-line editing. InputWidget is single-line only.

### Table — `<table>`

Tabular data display with column headers, cell alignment, and row selection. One of the most common TUI use cases: process lists, data panels, file managers, dashboard tables.

### Tabs — tab navigation

Tab bar for switching between content panels. Terminal space is limited; tab switching is the primary way to organize content in TUI apps.

---

## Important — Significant UX improvement

### Slider — `<input type="range">`

Horizontal slider for numeric value input. Settings panels for volume, opacity, speed, etc.

### Spinner — `<input type="number">`

Numeric input with increment/decrement controls. Cleaner than a plain Input with manual validation.

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
| Input | `<input type="text">` | Done |
| Checkbox | `<input type="checkbox">` | Done |
| Switch | toggle switch | Done |
| RadioGroup | `<input type="radio">` | Done |
| SelectButton | segmented control | Done |
| ProgressBar | `<progress>` | Done |
| ScrollBox | `overflow: auto` | Done |
