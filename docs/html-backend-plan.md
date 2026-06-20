# HTML Backend (#43)

Support rendering BuntUI apps in the browser via a pluggable `TerminalBackend` implementation. The approach is **WASM + ANSI passthrough** — compile the existing Zig rasterizer/presenter to wasm32, TS passes `DrawListBuffer` binary to WASM, WASM outputs ANSI strings, which are written to a browser-based terminal emulator (e.g. xterm.js). No DOM manipulation of UI elements.

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
