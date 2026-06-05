---
name: check-widget-props
description: Verify compiler PropHandlers in runtime-helpers.ts against actual widget implementations. Run after modifying widgets or the compiler prop maps.
---

# Check Widget Props

Verify that every method referenced in the per-widget `PropHandlers` (in `packages/compiler/src/runtime-helpers.ts`) actually exists on the corresponding widget class.

## Background

The compiler uses **per-widget** `PropHandlers` maps to generate reactive update code for dynamic props. Each entry maps a prop name to a `{method, field?}` pair:

- If `field` is present → generates `effect(() => { widget.updateXxx({field: val}) })` (partial merge via `update*`)
- If `field` is absent → generates `effect(() => { widget.setXxx(val) })` (direct setter via `set*`)

The maps are composed from shared fragments (`PH_RECT`, `PH_COLOR`, etc.) plus widget-specific entries. If a method referenced in a handler doesn't exist on the widget, it crashes at runtime with `TypeError: widget.xxx is not a function`.

## Architecture

### Shared Fragments

Defined as `Record<string, PropHandler>` in `runtime-helpers.ts`:

| Fragment | Props | Method Pattern |
|---|---|---|
| `PH_RECT` | `x`, `y`, `width`, `height` | `updateRect` with field |
| `PH_COLOR` | `colorFg`, `colorBg` | `updateColor` with field |
| `PH_STYLE` | `zIndex`, `styleModifier` | `updateStyle` with field |
| `PH_BORDER_FULL` | `border`, `colorBorder`, `borderStyle`, `borderTop`, `borderRight`, `borderBottom`, `borderLeft` | `updateBorder` with field |
| `PH_BORDER_STYLE_ONLY` | `borderStyle` | `updateBorder` with field |
| `PH_SHADOW` | `shadowOffsetX`, `shadowOffsetY`, `colorShadow`, `shadowCovered` | `updateShadow` with field |
| `PH_PADDING` | `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight` | `updatePadding` with field |
| `PH_VISIBLE` | `visible` | `setVisible` (no field) |
| `PH_DRAGGABLE` | `draggable` | `setDraggable` (no field) |
| `PH_DISABLED` | `disabled` | `setDisabled` (no field) |

### Per-Widget Maps

Each widget gets a `*_PROP_HANDLERS` constant composed from relevant fragments plus widget-specific entries:

**BOX_PROP_HANDLERS**: `PH_RECT`, `PH_COLOR`, `PH_STYLE`, `PH_BORDER_FULL`, `PH_SHADOW`, `PH_PADDING`, `PH_DRAGGABLE`, `PH_VISIBLE` + `direction→setDirection`, `gap→setGap`, `align→setAlign`

**TEXT_PROP_HANDLERS**: `PH_RECT`, `PH_COLOR`, `PH_STYLE`, `PH_DRAGGABLE`, `PH_VISIBLE` + `value→updateValue`, `scrollSpeed→setScrollSpeed`, `scrollPauseMs→setScrollPauseMs`

**INPUT_PROP_HANDLERS**: `PH_RECT`, `PH_COLOR`, `PH_BORDER_STYLE_ONLY`, `PH_DISABLED`, `PH_VISIBLE` + `value→updateValue`, `max→setMax`, `maxLength→setMaxLength`, `placeholder→setPlaceholder`, `label→setLabel`, `readonly→setReadonly`

**BUTTON_PROP_HANDLERS**: `PH_RECT`, `PH_DISABLED`, `PH_VISIBLE` + `value→updateValue`, plus 12 per-state style entries: `colorFgNormal→updateNormalStyle`, `colorBgNormal→updateNormalStyle`, `colorBorderNormal→updateNormalStyle`, `borderStyleNormal→updateNormalStyle`, `colorFgHovered→updateHoveredStyle`, `colorBgHovered→updateHoveredStyle`, `colorBorderHovered→updateHoveredStyle`, `borderStyleHovered→updateHoveredStyle`, `colorFgPressed→updatePressedStyle`, `colorBgPressed→updatePressedStyle`, `colorBorderPressed→updatePressedStyle`, `borderStylePressed→updatePressedStyle`

**CHECKBOX_PROP_HANDLERS**: `PH_RECT`, `PH_DISABLED`, `PH_VISIBLE` + `checked→setChecked`, `indeterminate→setIndeterminate`, `label→setLabel`

**SWITCH_PROP_HANDLERS**: `PH_RECT`, `PH_DISABLED`, `PH_VISIBLE` + `checked→setChecked`, `label→setLabel`

**RADIO_GROUP_PROP_HANDLERS**: `PH_RECT`, `PH_DISABLED`, `PH_VISIBLE` + `value→updateValue`, `options→setOptions`, `tabs→setOptions`

**SELECT_BUTTON_PROP_HANDLERS**: `PH_RECT`, `PH_DISABLED`, `PH_VISIBLE` + `value→updateValue`, `options→setOptions`, `tabs→setOptions`

**SCROLL_BOX_PROP_HANDLERS**: `PH_RECT`, `PH_COLOR`, `PH_BORDER_FULL`, `PH_SHADOW`, `PH_PADDING`, `PH_DISABLED`, `PH_VISIBLE` + `gap→setGap`, `alwaysShowScrollbar→setAlwaysShowScrollbar`, `colorScrollbar→setColorScrollbar`, `colorScrollbarTrack→setColorScrollbarTrack`

**PROGRESS_PROP_HANDLERS**: `PH_RECT`, `PH_DISABLED`, `PH_VISIBLE` + `value→updateValue`, `max→setMax`

### Codegen Boolean Flags

`template/codegen.ts` defines `BOOLEAN_FLAGS = new Set(['disabled', 'checked', 'readonly', 'draggable'])` — these props get string-to-bool conversion for static values.

## What to Check

### Step 1: Collect all widget classes

Scan `packages/core/src/widgets/` and `packages/extensions/src/widgets/` for all widget classes (files matching `*Widget.ts`).

For each widget class, collect:
- All methods whose name starts with `update` or `set`
- All `#field` private fields (check if `readonly` or mutable)
- Which base class it extends (TuiWidgetEntity, InteractiveWidget, etc.)

### Step 2: Verify each per-widget PropHandler

For every entry in each `*_PROP_HANDLERS` map:

1. Find the `method` name (e.g. `setGap`)
2. Verify the method exists on the specific widget class or its base classes
3. If `field` is set, verify the method accepts a `Partial<T>` style argument (calls like `widget.updateColor({colorFg: val})`)
4. If the method is missing → **BUG**: the field must be made mutable and the method added

### Step 3: Check for `readonly` fields with dynamic prop potential

For each widget, if a `readonly #field` corresponds to a prop that users might reasonably bind dynamically in templates (e.g. `placeholder`, `maxLength`, `scrollSpeed`, color fields), flag it as a potential issue even if it's not in the handlers yet. The user may add the mapping later.

### Step 4: Check for new widgets missing from CORE_REGISTRY

If a new widget class exists in `packages/core/src/widgets/` but has no entry in `CORE_REGISTRY` and no `*_PROP_HANDLERS` map, flag it — it needs to be registered before it can be used in SFC templates.

## Quick Reference: Widget Method Table

### Base Classes

| Method | Defined On | Available To |
|---|---|---|
| `updateRect` | TuiWidgetEntity (no-op) | All widgets |
| `setPercentSpec` | TuiWidgetEntity | All widgets |
| `setDraggable` | TuiWidgetEntity | All widgets |
| `setVisible` | TuiWidgetEntity | All widgets |
| `setDisabled` | InteractiveWidget | Button, Input, Checkbox, Switch, RadioGroup, SelectButton, ScrollBox, Progress |
| `setTabIndex` | InteractiveWidget | Same as setDisabled |

### Per-Widget Methods

| Method | Widget | Notes |
|---|---|---|
| `updateColor` | BoxWidget, TextWidget, InputWidget, ScrollBoxWidget | InputWidget is newer addition |
| `updateBorder` | BoxWidget, InputWidget, ScrollBoxWidget | InputWidget is newer addition |
| `updateShadow` | BoxWidget, ScrollBoxWidget | |
| `updatePadding` | BoxWidget, ScrollBoxWidget | |
| `updateStyle` | BoxWidget, TextWidget | |
| `updateValue` | TextWidget, ButtonWidget, InputWidget, ProgressWidget, SelectButtonWidget, RadioGroupWidget | |
| `updateNormalStyle` | ButtonWidget | Per-state style |
| `updateHoveredStyle` | ButtonWidget | Per-state style |
| `updatePressedStyle` | ButtonWidget | Per-state style |
| `setDirection` | BoxWidget | |
| `setGap` | BoxWidget, ScrollBoxWidget | |
| `setAlign` | BoxWidget | |
| `setScrollSpeed` | TextWidget | |
| `setScrollPauseMs` | TextWidget | |
| `setMax` | InputWidget, ProgressWidget | |
| `setMaxLength` | InputWidget | |
| `setPlaceholder` | InputWidget | |
| `setReadonly` | InputWidget | |
| `setLabel` | InputWidget, CheckboxWidget, SwitchWidget | |
| `setSelectionRange` | InputWidget | Takes two params (exception to single-value convention) |
| `setChecked` | CheckboxWidget, SwitchWidget | |
| `setIndeterminate` | CheckboxWidget | |
| `setOptions` | SelectButtonWidget, RadioGroupWidget | Also handles `tabs` prop |
| `setAlwaysShowScrollbar` | ScrollBoxWidget | |
| `setColorScrollbar` | ScrollBoxWidget | |
| `setColorScrollbarTrack` | ScrollBoxWidget | |

## How to Fix a Missing Method

When a handler targets a method that doesn't exist on a widget:

1. Find the widget's `#field` for that prop
2. Remove `readonly` from the field declaration
3. Add the setter/update method following the existing pattern in that widget
4. If the field affects layout, set `#layoutDirty = true` (for container widgets) or call the appropriate invalidation

Example for `setGap` on ScrollBoxWidget:

```typescript
// Before: readonly #gap: number;
// After:  #gap: number;

setGap(gap: number): void {
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
