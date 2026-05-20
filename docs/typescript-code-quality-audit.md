# TypeScript Code Quality Audit

Date: 2026-05-20

## 1. Bug

### 1.1 ~~`logDebug` uses `===` instead of `<=`~~ — False Positive

**File:** `packages/core/src/common/logger.ts:132`

~~The other three log methods (`logInfo`, `logWarning`, `logError`) all use `<=` for level filtering. `logDebug` uses `===`, which means setting the log level to `debug` only outputs debug messages and **silently drops info/warning/error**.~~

**Verdict:** Not a bug. `LOG_LEVEL_DEBUG = 0` is the lowest level. `this.#logLevel <= 0` and `this.#logLevel === 0` are only true when the level is set to DEBUG — the behavior is identical. The other three methods all use `<=` and work correctly when the level is DEBUG (e.g., `0 <= 1` is `true` for `logInfo`). No messages are silently dropped.

The `===` is arguably better style here since it makes the "no level below DEBUG" boundary explicit, though changing to `<=` for consistency with other methods is also reasonable.

---

## 2. Design Issues

### 2.1 ~~`onUnmounted` semantic mismatch~~ — False Positive

**File:** `packages/core/src/app/composables.ts:18`

~~The name implies "fires when a widget is unmounted", but it actually fires when the **entire scene is destroyed** (via `runSetup` cleanup). A developer would reasonably expect `onUnmounted(fn)` to fire per-widget, not per-scene.~~

**Verdict:** `onUnmounted` IS widget-level. The SFC compiler generates a separate `runSetup()` call for each component, each with its own `currentScope`. When a widget is destroyed, only that widget's scope cleanups run. The initial analysis only looked at `runSetup`'s cleanup return value and assumed it was a single scene-level call, missing that the compiler invokes it per-component.

### 2.2 Hardcoded global 'q' quit handler

**File:** `packages/core/src/app/TuiApp.ts:81-87`

Every TUI app unconditionally quits when 'q' is pressed, regardless of focus state. Typing 'q' in an input field also quits the app. No way to disable or configure.

```ts
EVENT_BUS.on(TuiEventType.KeyboardEvent, data => {
  if (data.key === 'q' || data.key === 'Q') {
    setTimeout(() => { this.stop(); });
  }
});
```

**Fix:** Make configurable via options (e.g., `quitKey?: string | false`), or remove and let application code register its own quit handler.

### 2.3 ~~`DrawListBuffer` inconsistent capacity checking~~ — Fixed

**File:** `packages/core/src/draw_list/DrawListBuffer.ts`

Variable-length commands (`drawText`, `setTitle`) call `#ensureCapacity`. Fixed-size commands (`drawRect`, `drawBorder`, `drawShadow`, `drawFill`, `drawChar`, `drawLine`) skip it. If enough fixed-size commands are pushed, the buffer silently overflows. Additionally, `#ensureCapacity` doesn't grow the buffer — it only throws. The name implies resizing.

**Fix applied:** Moved capacity check into `#writeHeader` so all commands are covered uniformly. Removed `#ensureCapacity` entirely.

### 2.4 ScrollBoxWidget mutates child rect during render

**File:** `packages/core/src/widgets/scroll-box/ScrollBoxWidget.ts:293-315`

Temporarily mutates a child's rect for clamping during `emitDrawCommands`, then restores it. If `emitDrawCommands` throws, the child is left in a corrupted state. Also triggers `#layoutDirty` side effects in some widgets.

**Fix:** Use a temporary "render rect" separate from the actual widget rect, or handle clamping at the DrawList level.

### 2.5 ~~`RadioGroupWidget.#hoveredIndex` serves dual purpose~~ — Fixed

**File:** `packages/core/src/widgets/radio/RadioGroupWidget.ts:38`

Named for hover state, but also used as keyboard navigation cursor. Mouse hover silently changes the keyboard position and vice versa.

**Fix applied:** Split into `#hoveredIndex` (mouse: `mouseover`/`mousemove`/`mouseout`/`mousedown`) and `#focusedIndex` (keyboard: `ArrowUp`/`ArrowDown`/`Enter`/`Space`). Rendering uses `isHovered || isFocused`. Note: `SelectButtonWidget` has the same field name but does NOT have this issue — its keyboard navigation (`ArrowLeft`/`ArrowRight`) directly selects, there is no independent keyboard cursor.

### 2.6 ~~`InputWidget` Ctrl+A handled via fragile switch case~~ — Fixed

**File:** `packages/core/src/widgets/input/InputWidget.ts:196-235`

An early return catches all printable chars without modifiers. `case 'a'` in the switch is only reachable with modifiers held, but this is implicit. Reordering the switch or changing the early return condition silently breaks Ctrl+A.

**Fix applied:** Moved Ctrl+A to an explicit `if (event.ctrlKey && event.key === 'a')` check before the switch. Also implemented Ctrl+Arrow (word navigation), Ctrl+Backspace/Ctrl+Delete (word deletion) using a `charCategory`-based word boundary system (WORD / SPACE / PUNCT / CJK). Additionally fixed a Windows VT input mode bug where Ctrl+Backspace loses its modifier flag (`windows_listener.zig`: infer `ctrl=true` when `unicode=0x08, vk=0`).

### 2.7 ~~`hitTest` re-sorts on every mouse event~~ — Fixed

**File:** `packages/core/src/extern/app/TuiScene.ts:105-117`

Creates a new reversed+sorted array on every mouse event (move, click, drag). `#getSortedWidgets()` already maintains a cached sorted array, but `hitTest` doesn't use it because it needs reverse order.

**Fix applied:** Added `#sortedReverseCache` alongside `#sortedCache`, both invalidated on mount/unmount. `hitTest` uses `#getSortedWidgetsReverse()`. `#deepHitTest` no longer sorts — iterates children in reverse assuming ascending zIndex order.

### 2.8 ~~Duplicated log level mapping~~ — Fixed

**Files:** `packages/core/src/app/NativeBackend.ts:50-73`, `packages/core/src/common/logger.ts:60-80`

Both files independently map `LogLevel` string → number. No shared constant or utility. Can diverge silently.

**Fix applied:** Extracted `logLevelToNumber(level: LogLevel): number` in `logger.ts`, exported and used by both `NativeBackend` and `LoggerImpl`. Also fixed naming (`logLvl` → `logLevelValue`).

---

## 3. Naming Issues

### 3.1 Typo: `#refrenceCount`

**File:** `packages/core/src/widgets/TuiWidgetEntity.ts:35`

Should be `#referenceCount` / `get referenceCount()`.

### 3.2 Misleading name: `TuiWidgetComponentType` is a bitmask

**File:** `packages/core/src/widgets/types.ts:4-30`

Values are power-of-two bit flags, but the name suggests a mutually-exclusive enum.

**Fix:** Rename to `TuiWidgetComponentFlag`.

### 3.3 Inconsistent import alias: `TuiDataViewWrapper` → `TuiDataView`

**Files:** `extern/app/TuiContext.ts:4`, `app/NativeBackend.ts:6`, `events/types.ts:1`

Three files alias `TuiDataViewWrapper` to `TuiDataView`. `DrawListBuffer.ts` uses the full name. The alias also collides conceptually with the banned `DataView` type.

**Fix:** Use `TuiDataViewWrapper` everywhere.

### 3.4 `fetchDllPath` implies async

**File:** `packages/core/src/utils/ffi.ts:14`

"fetch" universally implies an async network request. This function is synchronous filesystem path resolution.

**Fix:** Rename to `resolveNativeLibPath`.

### 3.5 `useOffsetCounter` mimics React hook naming

**File:** `packages/core/src/utils/ffi.ts:72`

The `use` prefix signals a React/Vue composition hook. This is a plain factory function.

**Fix:** Rename to `createOffsetCalculator`.

### 3.6 `fillZero` reinvents `padStart`

**File:** `packages/core/src/common/logger.ts:39-46`

Non-standard name for string padding. The entire function can be replaced by `String.prototype.padStart`.

**Fix:** Inline with `number_.toString().padStart(length, '0')`.

### 3.7 `SCHEMA_CLASS` SCREAMING_SNAKE_CASE for runtime local

**File:** `packages/core/src/app/NativeBackend.ts:113`

Convention reserves SCREAMING_SNAKE_CASE for module-level constants. This is a runtime Map lookup result.

**Fix:** Use `schemaClass`.

### 3.8 `logLvl` vs `logLevel` inconsistency

**File:** `packages/core/src/app/NativeBackend.ts:51`

Parameter is `logLevel`, local variable is `logLvl`. Unnecessary abbreviation in the same function.

**Fix:** Use `logLevelValue` for the numeric version.

### 3.9 Single-letter `o` for cursor offset

**File:** `packages/core/src/draw_list/DrawListBuffer.ts` (7 methods)

Used in delicate binary packing with multiple computed offsets (`o + 2`, `o + 4`, `o + 8`).

**Fix:** Rename to `offset`.

### 3.10 Single-letter `v` / `h` for vertical/horizontal

**File:** `packages/core/src/widgets/box/BoxWidget.ts:103-113`

**Fix:** Use `isVertical` / `isHorizontal`.

### 3.11 Trailing underscore anti-pattern: `string_`, `number_`

**Files:** `utils/string-width.ts`, `utils/ffi.ts`, `common/logger.ts`

No legitimate reason to avoid shadowing `String`/`Number` constructors in these functions.

**Fix:** Use `text`, `value`, `str` etc.

### 3.12 Snake_case private fields: `#prev_frame`, `#next_frame`

**File:** `packages/core/src/extern/render/FrameStringArena.ts:61-62`

Inconsistent with every other class in the codebase which uses camelCase for `#` private fields.

**Fix:** Rename to `#prevFrame` / `#nextFrame`.

### 3.13 `module_` trailing underscore

**File:** `packages/core/src/app/TuiApp.ts:151`

No outer `module` binding being shadowed. The name doesn't convey that it's a casted version.

**Fix:** Rename to `moduleRecord`.

### 3.14 `#ownChildren` semantic ambiguity

**Files:** `packages/core/src/widgets/box/BoxWidget.ts:171`, `packages/core/src/widgets/scroll-box/ScrollBoxWidget.ts:15`

Both `#children` (inherited) and `#ownChildren` contain the same child objects. The distinction is layout-specific, but the name doesn't convey this.

**Fix:** Rename to `#layoutChildren`.

### 3.15 Mixed Chinese/English in log messages and comments

**Files:** `packages/core/src/app/TuiApp.ts:68-72`, `packages/core/src/extern/render/FrameStringArena.ts:47,54`

All other comments and logs in the codebase are in English.

**Fix:** Translate to English.
