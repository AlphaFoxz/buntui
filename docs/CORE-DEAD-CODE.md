# Core Package Dead Code Audit

Last audited: 2026-04-29

## Entire stale modules

These files have zero production imports and can be safely deleted.

| File | Description | Replaced by |
|------|-------------|-------------|
| `extern/ansi.ts` | FFI wrappers for `resetStyle`, `showCursor`, `hideCursor`, `clearScreen`, `drawText` | DrawList commands (`buf.hideCursor()`, etc.) |
| `reactivity/index.ts` | Custom `ref()` wrapper over `@vue/reactivity` | Direct `import { ref } from '@vue/reactivity'` in compiler output |
| `extern/render/FrameStringArena.ts` | String arena for shared memory string transfer | DrawList encodes strings inline via `TextEncoder` |

## Unused types / interfaces

Defined but never referenced outside their own file.

| File | Symbol | Notes |
|------|--------|-------|
| `extern/app/types.ts` | `TuiRenderCommandType`, `TuiRenderCommand` | Old object-based command system, replaced by `DrawCmd` |
| `events/types.ts` | `EventSchema` | Old event parsing interface, replaced by JSON constructors |
| `extern/types.ts` | `Disposable` | `Symbol.dispose` / `Symbol.asyncDispose` pattern never adopted |
| `extern/types.ts` | `Entity` | Generic entity interface, `TuiWidgetEntity` has its own `id` |
| `extern/widgets/types.ts` | `TuiWidgetComponentType` | ECS bitmask system never wired up |
| `extern/widgets/types.ts` | `TuiWidgetBorderStyle` | Duplicates `BorderStyle` in `draw_list/types.ts` |
| `extern/app/TuiContext.ts` | `TuiResizeBehavior` | Only used internally in the same file |

## Unused FFI symbols

Loaded in `extern/events.ts` but never called from TypeScript.

| Symbol | Purpose | Status |
|--------|---------|--------|
| `event_bus_setup` | Initialize event bus on JS side | Bus is set up by Zig before `startApp` returns |
| `event_bus_emit` | Emit events from JS side | Only Zig emits; JS only consumes |
| `event_bus_stats` | Get queue statistics | Never needed for debugging |

Only `event_bus_poll` and `event_bus_commit` are actually used.

## DrawList API defined but never called

Methods on `DrawListBuffer` with Zig-side implementations ready, but no TS production code calls them.

| Method | File line | Companion types |
|--------|-----------|-----------------|
| `drawShadow()` | ~160 | — |
| `drawFill()` | ~181 | — |
| `drawChar()` | ~198 | — |
| `drawLine()` | ~219 | `LineDirection`, `LineStyle` in `types.ts` |
| `setTitle()` | ~240 | — |
| `setCursorMode()` | ~257 | `CursorMode` in `types.ts` |
| `setEntityId()` | ~85 | — |

**Decision needed**: Keep as future API surface, or remove until widgets actually need them?

## Unused utility functions

| File | Symbol | Notes |
|------|--------|-------|
| `utils/ffi.ts` | `setDllPath()` | Manual DLL path override, never needed |
| `utils/ffi.ts` | `toU8()`, `toU16()`, `toU32()` | Numeric conversion wrappers, never called |
| `utils/ffi.ts` | `validateU8()`, `validateU16()`, `validateU32()`, `validateU64()` | **Has bug**: inverted boolean logic (returns `true` for out-of-range). Never called so dormant. |
| `utils/ffi.ts` | `cToString()` | Only used in test for `FrameStringArena` |
| `utils/styles.ts` | `rgb()` | Only used in its own test; production uses `rgbToRgba()` |

## Dead code in live files

### `app/TuiApp.ts`

- `appInstance` (line ~131): declared as `const ... = undefined`, never reassigned. The `onUnexceptExit` handler checks `if (appInstance)` which is always `false`.
- `destroyScene()` (line ~105): defined but no consumer calls it. Playground only creates one scene.

### `extern/app/TuiScene.ts`

- `setBgRgb()` (line ~70): three overloads defined, never called. Background is set in constructor only.

### `events/index.ts`

- `EventBusImpl.off()`: defined but never called. Handlers are registered but never removed.

### `common/logger.ts`

- `LoggerImpl.logWarning()`: defined but never called. Only `logDebug`, `logInfo`, `logError` are used.

### `events/types.ts`

- `MouseEvent.LEFT/MIDDLE/RIGHT_MOUSE_BUTTON` static constants: defined but never referenced.

### `core/index.ts` — dead exports

| Export | Imported by |
|--------|-------------|
| `export * as widgets from './widgets'` | Nobody (playground uses named imports like `createText`) |
| `export { default as TuiApp }` from `./app` | Nobody (playground uses `createApp()`) |
| `export { TuiContext }` from `./extern/app` | Nobody (only `TUI_CONTEXT_INSTANCE` is imported) |

### `extern/TuiDataViewWrapper.ts`

~15 pass-through methods never called from production code: `getFloat32/64`, `getInt8/16/32`, `setFloat32/64`, `setInt8/16/32`, `get/setFloat16`, `get/setBigInt64`, `[Symbol.toStringTag]`. Only `get/setUint8/16/32`, `set/getBigUint64`, `set/getBool` are used.

## Recommendations

**Low risk, high value (delete now):**
- The three stale modules (`ansi.ts`, `reactivity/index.ts`, `FrameStringArena.ts`)
- Unused types (`Disposable`, `Entity`, `EventSchema`, `TuiWidgetComponentType`, `TuiRenderCommand`)
- Dead exports in `core/index.ts`
- `appInstance` + broken `onUnexceptExit` in `TuiApp.ts`
- Buggy `validateU8/16/32/64` functions

**Medium risk (keep until Phase 2 Widget library):**
- Unused DrawList methods (`drawShadow`, `drawFill`, `drawChar`, `drawLine`, etc.) — these may be needed when new widgets are built
- `destroyScene()` — will be needed for multi-scene apps

**Design decision needed:**
- `TuiWidgetBorderStyle` vs `BorderStyle` in `draw_list/types.ts` — decide which one is canonical
- `EventBus.off()` — keep for cleanup patterns, or remove YAGNI?
- `TuiDataViewWrapper` unused pass-through methods — keep for API completeness, or trim to what's used?
