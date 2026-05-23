---
name: check-widget-props
description: Verify compiler widget-props.ts mappings against actual widget implementations. Run after modifying widgets or the compiler prop maps.
---

# Check Widget Props

Verify that every method in `PROP_UPDATE_MAP` and `FLAG_PROP_MAP` (in `packages/compiler/src/template/widget-props.ts`) actually exists on every widget that could receive the corresponding dynamic prop.

## Background

The compiler uses two global maps to generate reactive update code for dynamic props:

- **`PROP_UPDATE_MAP`** — maps prop names to `{method, field}` pairs (e.g. `gap → updateGap`). Generates `effect(() => { widget.updateGap(val) })`.
- **`FLAG_PROP_MAP`** — maps prop names to setter method names (e.g. `label → setLabel`). Generates `effect(() => { widget.setLabel(val) })`.

These maps are **global** — any widget receiving a dynamic binding for that prop name will trigger the method call. If the widget doesn't implement the method, it crashes at runtime with `TypeError: widget.xxx is not a function`.

## What to Check

### Step 1: Collect all widget classes

Scan `packages/core/src/widgets/` and `packages/extensions/src/widgets/` for all widget classes (files matching `*Widget.ts`).

For each widget class, collect:
- All methods whose name starts with `update`, `set`, or `hijack`
- All `#field` private fields (check if `readonly` or mutable)
- Which base class it extends (TuiWidgetEntity, InteractiveWidget, etc.)

### Step 2: Verify each mapping

For every entry in `PROP_UPDATE_MAP`:

1. Find the `method` name (e.g. `updateGap`)
2. Find ALL widgets that have a constructor option matching the prop name (e.g. which widgets accept `gap` in their options)
3. For each such widget, verify the method exists on the widget or its base classes
4. If the method is missing → **BUG**: the field must be made mutable and the method added

For every entry in `FLAG_PROP_MAP`:

1. Find the setter method name (e.g. `setLabel`)
2. Find ALL widgets that have a constructor option matching the prop name
3. For each such widget, verify the setter exists
4. If the setter is missing → **BUG**: add the setter and remove `readonly` from the field

### Step 3: Check for `readonly` fields with dynamic prop potential

For each widget, if a `readonly #field` corresponds to a prop that users might reasonably bind dynamically in templates (e.g. `placeholder`, `maxLength`, `password`, `scrollSpeed`, color fields), flag it as a potential issue even if it's not in the maps yet. The user may add the mapping later.

## Quick Reference: Inherited Methods

| Method | Defined On | Available To |
|---|---|---|
| `updateRect` | TuiWidgetEntity (no-op) | All widgets |
| `setDraggable` | TuiWidgetEntity | All widgets |
| `setVisible` | TuiWidgetEntity | All widgets |
| `setDisabled` | InteractiveWidget | Button, Input, Checkbox, Switch, RadioGroup, SelectButton, ScrollBox, Progress |
| `updateColor` | BoxWidget, TextWidget, ScrollBoxWidget | Only those three |
| `updateBorder` | BoxWidget, ScrollBoxWidget | Only those two |
| `updateShadow` | BoxWidget, ScrollBoxWidget | Only those two |
| `updatePadding` | BoxWidget, ScrollBoxWidget | Only those two |
| `updateGap` | BoxWidget, ScrollBoxWidget | Only those two |
| `updateDirection` | BoxWidget | BoxWidget only |
| `updateAlign` | BoxWidget | BoxWidget only |
| `updateStyle` | BoxWidget, TextWidget | Only those two |
| `updateValue` | TextWidget, ButtonWidget, InputWidget, ProgressWidget, SelectButtonWidget, RadioGroupWidget | Only those six |
| `setChecked` | CheckboxWidget, SwitchWidget | Only those two |
| `setIndeterminate` | CheckboxWidget | CheckboxWidget only |
| `setReadonly` | InputWidget | InputWidget only |
| `setLabel` | InputWidget, CheckboxWidget, SwitchWidget | Only those three |
| `setOptions` | SelectButtonWidget, RadioGroupWidget | Only those two |
| `hijackConsole` | *(none — dead mapping)* | No widget implements this |

## How to Fix a Missing Method

When a mapping targets a method that doesn't exist on a widget:

1. Find the widget's `#field` for that prop
2. Remove `readonly` from the field declaration
3. Add the setter/update method following the existing pattern in that widget
4. If the field affects layout, set `#layoutDirty = true` (for container widgets) or call the appropriate invalidation

Example for `updateGap` on ScrollBoxWidget:

```typescript
// Before: readonly #gap: number;
// After:  #gap: number;

updateGap(gap: number): void {
  this.#gap = gap;
  this.#layoutDirty = true;
}
```

## Automation

Run this check via:
```bash
bun run --cwd ./packages/core test -- packages/core/src/widgets/**/__tests__/*.test.ts
bun run --cwd ./packages/compiler test -- packages/compiler/src/__tests__/*.test.ts
```

Consider adding a dedicated test file `packages/compiler/src/__tests__/widget-props-consistency.test.ts` that programmatically verifies the mappings.
