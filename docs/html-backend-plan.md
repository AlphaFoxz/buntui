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

|               | TS Port                                        | WASM (chosen)                                 |
| ------------- | ---------------------------------------------- | --------------------------------------------- |
| Code to write | ~2000 lines (port rasterizer + presenter)      | ~340 lines (4 stub modules)                   |
| Maintenance   | Two rasterizer implementations to keep in sync | One codebase, shared between native and HTML  |
| Performance   | Good enough                                    | Better (native memory layout, no GC pressure) |
| Risk          | Subtle bugs from manual port                   | Same battle-tested code as native             |

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

| Module                 | Problem                                | WASM Replacement                                                 |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `core/std_io.zig`      | Binds to stdout                        | Write to `ArrayList(u8)` memory buffer; JS reads via WASM export |
| `core/logger.zig`      | File I/O + threading                   | No-op stub (browser console via JS if needed)                    |
| `core/tui_context.zig` | `detectTermSize()` uses kernel32/posix | Keep struct, `detectTermSize` → no-op; JS sets dimensions        |
| `core/error.zig`       | `std.process.exit()`                   | Replace with `@trap()`                                           |

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

| Bun/Node API          | Affected Files                                                        | Fix                                                                         |
| --------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `bun:ffi` Pointer/ptr | `extern/types.ts`, `TuiContext.ts`, `DrawListBuffer.ts`, `pointer.ts` | Abstract `Pointer` type; browser = `number` (WASM linear memory)            |
| `Bun.color()`         | `utils/color.ts`, `utils/styles.ts`                                   | Replace with lightweight CSS color parser (Canvas API or manual hex/rgb)    |
| `setImmediate`        | `RenderLoop.ts`, `common/logger.ts`                                   | Wrap in `nextTick()` utility; browser fallback to `setTimeout`              |
| `process.exit/on`     | `TuiApp.ts`                                                           | Guard with `typeof process !== 'undefined'`                                 |
| `Bun.main`            | `TuiApp.ts`                                                           | Make log dir optional; browser skips file logging                           |
| `node:fs/path`        | `common/logger.ts`                                                    | Abstract logger backend; browser uses `console`                             |
| `node:child_process`  | `SystemClipboard.ts`, `clipboard/index.ts`                            | Lazy instantiation; browser uses `navigator.clipboard`                      |
| `node:buffer/process` | `HmrErrorOverlayWidget.ts`                                            | Use `btoa()` instead of `Buffer`; dev-only, can exclude from browser builds |

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

- [x] **A-1** Make `TuiContext` work without FFI `Pointer` — allow plain JS object for non-native backends
- [x] **A-2** Relax `CStruct` type in `TuiBackend` or introduce a generic context type so HTML backend doesn't need a fake pointer
- [x] **A-3** Make `RenderLoop` timer-configurable — allow `requestAnimationFrame` alongside `setImmediate`

### Phase B — Zig WASM Build

- [x] **B-1** Create WASM stub for `core/std_io.zig` — memory-backed writer instead of stdout
- [x] **B-2** Create WASM stub for `core/logger.zig` — no-op all log functions
- [x] **B-3** Create WASM stub for `core/tui_context.zig` — keep struct, no-op `detectTermSize`
- [x] **B-4** Create WASM stub for `core/error.zig` — replace `process.exit` with `@trap()`
- [x] **B-5** Add `wasm32` build target to `build.zig` with comptime module selection (stubs vs native)
- [x] **B-6** New WASM exports: `renderDrawListToBuffer()`, `getOutputPtr()`/`getOutputLen()`, `setTerminalSize()`
- [x] **B-7** New WASM exports for JS→WASM memory transfer: `allocWasmBuffer(size) -> ptr` / `deallocWasmBuffer(ptr)` so JS can copy `DrawListBuffer` and `TuiContext` data into WASM linear memory
- [x] **B-8** New WASM exports for TuiContext lifecycle: `createTuiContext() -> ptr` / `updateTuiContext(ptr, tick, x, y, rows, cols, resizeBehavior, debugMode)` / `destroyTuiContext(ptr)` — `renderDrawListToBuffer` expects `*TuiContext` in WASM memory, but no export currently creates one
- [x] **B-9** Test WASM build locally — compile, load in browser, feed a DrawListBuffer, read ANSI output

### Phase C — HTML Backend Implementation

- [x] **C-1** WASM module loader — load `.wasm` binary via `WebAssembly.instantiateStreaming`, handle async/sync mismatch with `TuiApp` constructor (e.g. deferred init: `HtmlBackend` stores a promise, `startApp()` awaits it). Expose WASM memory (`WebAssembly.Memory`) so JS can write into it
- [x] **C-2** Implement `HtmlBackend` class — constructor accepts `{container: HTMLElement, terminal?: Terminal}` (user controls mount point, not `startApp`). `startApp` initializes terminal size only, does not create DOM
- [x] **C-3** Implement `setupLogger` — bridge to browser `console`
- [x] **C-4** Implement `detectTermSize` — read `Terminal.rows`/`Terminal.cols` from xterm.js, write into WASM-side `TuiContext` via `updateTuiContext` export
- [x] **C-5** Implement `renderDrawList` — copy `DrawListBuffer.buffer` (JS ArrayBuffer) into WASM memory via `allocWasmBuffer`, call `renderDrawListToBuffer(wasm_ctx_ptr, wasm_buf_ptr, buf_len)`, read ANSI output via `getOutputPtr()`/`getOutputLen()`, call `Terminal.write()`, then `deallocWasmBuffer`
- [x] **C-6** Implement `startEvents`/`stopEvents` — attach to xterm.js `onKey`/`onMouse`/`onResize`, convert to TuiEvent via factory functions, feed into `handler`. Handle terminal resize from `onResize`. This merges old Phase D into C to keep `HtmlBackend` a complete `TuiBackend` implementation at the end of the phase
- [x] **C-7** Add factory functions for event classes (`fromDomEvent`) — construct `KeyboardEvent`/`MouseEvent`/`WheelEvent`/`TermResizeEvent` from xterm.js `IKeyboardEvent`/`IMouseEvent`/`IWheelEvent`/resize event

### Phase D — Packaging & DX

User DX model: users bring their own web framework, create their own xterm.js (or compatible) `Terminal` instance, and pass it to BuntUI explicitly. BuntUI does not create DOM or manage the terminal lifecycle.

```ts
import {Terminal} from '@xterm/xterm';
import {HtmlBackend, WasmModule, createApp} from '@buntui/core';

const wasm = await WasmModule.load('/buntui.wasm');
const app = createApp({backend: new HtmlBackend({terminal, wasmModule: wasm})});
app.start();
```

- [ ] **D-1** Isolate `NativeBackend` from main barrel — remove `NativeBackend` export from `packages/core/src/index.ts` so browser bundlers never touch `bun:ffi`. `HtmlBackend` and `WasmModule` remain in the main barrel (no `bun:ffi` dependency, safe for both environments). `createBackend()` in `platform/browser.ts` keeps throwing — users must pass `backend` explicitly. `NativeBackend` is only reachable via `@buntui/core/platform` conditional export (native path, where `bun:ffi` exists). No separate `@buntui/html` package needed; xterm.js is a peer dependency
- [ ] **D-2** Connect existing `playground-web/` to `HtmlBackend` — directory already exists with Vite + xterm.js setup. Wire up a demo app that loads WASM, creates `HtmlBackend`, and renders a BuntUI app into the xterm.js terminal
- [ ] **D-3** Verify browser bundling with Vite — confirm `@buntui/core` main entry does not pull in `bun:ffi` or native shared libraries. `@buntui/core/platform` conditional export (`"browser"` → `browser.js`) resolves correctly. Run a production build of `playground-web/` and check bundle contents
- [ ] **D-4** Configure `playground-web/vite.config.ts` for WASM — no custom Vite plugin needed; use Vite's built-in `?url` asset handling or `vite-plugin-wasm` for `.wasm` files, plus `optimizeDeps.exclude` for `@buntui/core`
- [ ] **D-5** Guard `ptr()` in browser platform — throw or log warning instead of silently returning 0, to catch accidental FFI pointer usage in browser path
- [ ] **D-6** WASM binary packaging — in `bun run build`, after Zig wasm32 build, copy `.wasm` output to `packages/core/dist/buntui.wasm`. Expose via `@buntui/core/wasm` sub-path export (returns URL string for `WebAssembly.instantiateStreaming`) or document that users serve the `.wasm` file from their own static assets

## Dependency Graph

```
Phase 0 (platform abstraction) ← prerequisite, no business logic changes
  └→ A (interface refactor)
      ├→ B (Zig WASM build) ← core workload, but mostly stubs not new code
      │   └→ C (HTML backend implementation) ← WASM loader + xterm.js wiring + event bridge (all in one phase)
      └→ D (packaging & DX) ← depends on C; mostly validation + wiring, no new architecture
```

## Estimated Effort

| Phase                    | Effort   | Notes                                                                     |
| ------------------------ | -------- | ------------------------------------------------------------------------- |
| 0 — Platform abstraction | 2-3 days | Defensive guards + type abstractions, ~10 files, no business logic change |
| A — Interface refactor   | 1 day    | Small, mostly type-level changes                                          |
| B — Zig WASM build       | 1-2 days | 4 stub modules (~340 lines) + build config + new exports (B-7, B-8)      |
| C — HTML backend         | 2-3 days | WASM loader + memory management + xterm.js rendering + event bridge       |
| D — Packaging & DX       | 1-2 days | Barrel isolation, WASM packaging, playground-web demo, bundler validation |

**Total: ~1.5 weeks**

## Open Questions

- **WASI vs freestanding**: WASI provides `c_allocator` and is easier. Freestanding wasm32 needs a custom allocator. WASI is likely sufficient — all major browsers support it.
- **Terminal emulator compatibility**: the `TerminalBackend` abstraction should allow other browser terminals (not just xterm.js). The `HtmlBackend` already accepts a `TerminalLike` interface (`onKey`, `onMouse`, `onResize`, `write`) so any compatible terminal library can be used.
- **WASM binary size**: estimate needed. The rasterizer + presenter + ansi_util is ~3000 lines of Zig, should produce a small WASM binary.
- **WASM memory ownership**: `allocWasmBuffer`/`deallocWasmBuffer` means JS manages WASM heap memory manually. Need to verify no leaks on rapid render frames (alloc per frame, dealloc after write). Alternatively, use a fixed-size reusable WASM buffer if max DrawList size is bounded.
