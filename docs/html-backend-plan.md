# HTML Backend Plan (#43)

Support rendering BuntUI apps in the browser via a pluggable `TerminalBackend` implementation. The approach is **WASM + ANSI passthrough** — compile the existing Zig rasterizer/presenter to wasm32, TS passes `DrawListBuffer` binary to WASM, WASM outputs ANSI strings, which are written to a browser-based terminal emulator (e.g. xterm.js). No DOM manipulation of UI elements.

Last updated: 2026-06-03

## Core Idea

```
Native:  TS → DrawListBuffer (binary) → FFI → Zig rasterizer → ANSI → stdout
HTML:    TS → DrawListBuffer (binary) → WASM → Zig rasterizer (same code) → ANSI → JS reads buffer → xterm.js Terminal.write()
```

Same Zig code, two compilation targets. No TS-side rasterizer port needed.

## Why WASM Instead of TS Port

| | TS Port | WASM (chosen) |
|---|---|---|
| Code to write | ~2000 lines (port rasterizer + presenter) | ~340 lines (4 stub modules) |
| Maintenance | Two rasterizer implementations to keep in sync | One codebase, shared between native and HTML |
| Performance | Good enough | Better (native memory layout, no GC pressure) |
| Risk | Subtle bugs from manual port | Same battle-tested code as native |

## Zig Code Portability Analysis

### Compiles to wasm32 as-is (zero changes, ~2000 lines)

- `draw_list/commands.zig` — pure types and enums
- `draw_list/binary.zig` — LE byte readers, zero imports
- `draw_list/rasterizer.zig` — pure computation, writes to cell array
- `draw_list/parser.zig` — pure computation
- `draw_list/clip_stack.zig` — pure data structure
- `ansi_util/*.zig` — all use `anytype` writer, not bound to stdout
- `render/frame.zig` — uses `c_allocator` (WASI compatible)
- `core/event_bus.zig` — lock-free atomics, no OS calls
- `core/typedef.zig` — type aliases

### Needs WASM stubs (~340 lines, 1-2 days)

| Module | Problem | WASM Replacement |
|---|---|---|
| `core/std_io.zig` | Binds to stdout | Write to `ArrayList(u8)` memory buffer; JS reads via WASM export |
| `core/logger.zig` | File I/O + threading | No-op stub (browser console via JS if needed) |
| `core/tui_context.zig` | `detectTermSize()` uses kernel32/posix | Keep struct, `detectTermSize` → no-op; JS sets dimensions |
| `core/error.zig` | `std.process.exit()` | Replace with `@trap()` |

## Current Architecture

The backend is already a dependency injection point — `TuiApp` accepts `{backend?: TuiBackend}` and defaults to `NativeBackend` (Zig FFI). The `TuiBackend` interface has 7 methods:

```typescript
type TuiBackend = {
  setupLogger(...): void;
  startApp(): void;
  stopApp(): void;
  detectTermSize(context: CStruct): void;
  renderDrawList(context: CStruct, buffer: DrawListBuffer): void;
  startEvents(handler: TuiBackendEventHandler): void;
  stopEvents(): void;
};
```

An HTML backend only needs to implement this interface. No changes to the interface itself are required.

## Bun/Node API Audit

The widget layer and event system are completely clean (pure TS). Blockers are concentrated in ~10 infrastructure files, ~20 call sites total. All changes are defensive (platform guards, type abstractions) — no business logic changes needed.

| Bun/Node API | Affected Files | Fix |
|---|---|---|
| `bun:ffi` Pointer/ptr | `extern/types.ts`, `TuiContext.ts`, `DrawListBuffer.ts`, `pointer.ts` | Abstract `Pointer` type; browser = `number` (WASM linear memory) |
| `Bun.color()` | `utils/color.ts`, `utils/styles.ts` | Replace with lightweight CSS color parser (Canvas API or manual hex/rgb) |
| `setImmediate` | `RenderLoop.ts`, `common/logger.ts` | Wrap in `nextTick()` utility; browser fallback to `setTimeout` |
| `process.exit/on` | `TuiApp.ts` | Guard with `typeof process !== 'undefined'` |
| `Bun.main` | `TuiApp.ts` | Make log dir optional; browser skips file logging |
| `node:fs/path` | `common/logger.ts` | Abstract logger backend; browser uses `console` |
| `node:child_process` | `SystemClipboard.ts`, `clipboard/index.ts` | Lazy instantiation; browser uses `navigator.clipboard` |
| `node:buffer/process` | `HmrErrorOverlayWidget.ts` | Use `btoa()` instead of `Buffer`; dev-only, can exclude from browser builds |

## Task List

### Phase 0 — Core Platform Abstraction (prerequisite)

Remove all hard Bun/Node dependencies from core runtime so both native and browser paths compile cleanly.

- [x] **0-1** Abstract `Pointer` type — make `CStruct` / `DrawListBuffer` / `TuiContext` work with `number` in browser
- [x] **0-2** Replace `Bun.color()` with browser-compatible color parser in `color.ts` and `styles.ts`
- [x] **0-3** Abstract `setImmediate` — create `nextTick()` utility, browser falls back to `setTimeout`
- [x] **0-4** Guard `process.exit` / `process.on` in `TuiApp.ts` with platform detection
- [x] **0-5** Abstract logger backend — `LogSink` interface, file-based for native, `console` for browser
- [x] **0-6** Lazy-load `SystemClipboard` — defer `spawnSync` to first use; browser uses `navigator.clipboard`
- [x] **0-7** Fix `HmrErrorOverlayWidget` — replace `node:buffer` with `btoa()`, guard `stdout.write`
- [x] **0-8** Run full test suite to verify no regression on native path

### Phase A — Backend Interface Refactor

- [ ] **A-1** Make `TuiContext` work without FFI `Pointer` — allow plain JS object for non-native backends
- [ ] **A-2** Relax `CStruct` type in `TuiBackend` or introduce a generic context type so HTML backend doesn't need a fake pointer
- [ ] **A-3** Make `RenderLoop` timer-configurable — allow `requestAnimationFrame` alongside `setImmediate`

### Phase B — Zig WASM Build

- [ ] **B-1** Create WASM stub for `core/std_io.zig` — memory-backed writer instead of stdout
- [ ] **B-2** Create WASM stub for `core/logger.zig` — no-op all log functions
- [ ] **B-3** Create WASM stub for `core/tui_context.zig` — keep struct, no-op `detectTermSize`
- [ ] **B-4** Create WASM stub for `core/error.zig` — replace `process.exit` with `@trap()`
- [ ] **B-5** Add `wasm32` build target to `build.zig` with comptime module selection (stubs vs native)
- [ ] **B-6** New WASM exports: `renderDrawListToBuffer()`, `getOutputPtr()`/`getOutputLen()`, `setTerminalSize()`
- [ ] **B-7** Test WASM build locally — compile, load in browser, feed a DrawListBuffer, read ANSI output

### Phase C — HTML Backend Implementation

- [ ] **C-1** Implement `HtmlBackend` class — `startApp` creates xterm.js `Terminal` instance + DOM container
- [ ] **C-2** Implement `detectTermSize` — read `Terminal.rows`/`Terminal.cols` from xterm.js
- [ ] **C-3** Implement `renderDrawList` — pass `DrawListBuffer` to WASM, read ANSI output, call `Terminal.write()`
- [ ] **C-4** Implement `setupLogger` — noop or bridge to browser console

### Phase D — Event Bridge

- [ ] **D-1** Add factory functions for event classes (`fromDomEvent`) that construct from xterm.js `KeyboardEvent`/`MouseEvent`/`WheelEvent`
- [ ] **D-2** Implement `startEvents`/`stopEvents` — attach to xterm.js `onKey`/`onMouse`/`onResize` events, convert, feed into `handler`
- [ ] **D-3** Handle terminal resize from xterm.js `onResize` event

### Phase E — Packaging & DX

- [ ] **E-1** Create `@buntui/html` package with `HtmlBackend` + WASM loader
- [ ] **E-2** Add browser entry point / example app (xterm.js in a page, BuntUI rendering into it)
- [ ] **E-3** Ensure tree-shaking works — native FFI code (`bun:ffi`, `.dll`/`.so`/`.dylib`) excluded from browser builds
- [ ] **E-4** Dev server for browser target (Vite plugin?)

## Dependency Graph

```
Phase 0 (platform abstraction) ← prerequisite, no business logic changes
  └→ A (interface refactor)
      ├→ B (Zig WASM build) ← core workload, but mostly stubs not new code
      │   └→ C (HTML backend implementation) ← wires WASM output to xterm.js
      │       └→ D (event bridge) ← xterm.js events → TuiEvent
      └→ E (packaging & DX) ← independent, can start early
```

## Estimated Effort

| Phase | Effort | Notes |
|---|---|---|
| 0 — Platform abstraction | 2-3 days | Defensive guards + type abstractions, ~10 files, no business logic change |
| A — Interface refactor | 1 day | Small, mostly type-level changes |
| B — Zig WASM build | 1-2 days | Write 4 stub modules (~340 lines) + build config + new exports |
| C — HTML backend | 1-2 days | Thin wrapper: WASM → ANSI → xterm.js |
| D — Event bridge | 1-2 days | Factory functions + xterm.js event listeners |
| E — Packaging & DX | 2-3 days | Package setup, example app, tree-shaking |

**Total: ~1.5-2 weeks**

## Open Questions

- **WASI vs freestanding**: WASI provides `c_allocator` and is easier. Freestanding wasm32 needs a custom allocator. WASI is likely sufficient — all major browsers support it.
- **xterm.js event API**: xterm.js exposes `onKey` (not raw `keydown`/`keyup`). Need to verify if modifier/key info is sufficient for the existing `KeyboardEvent` class.
- **Terminal emulator compatibility**: the `TerminalBackend` abstraction should allow other browser terminals (not just xterm.js). Need to define a minimal adapter interface.
- **WASM binary size**: estimate needed. The rasterizer + presenter + ansi_util is ~3000 lines of Zig, should produce a small WASM binary.
