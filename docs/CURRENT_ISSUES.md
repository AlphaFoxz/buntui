# Current Issues

Last updated: 2026-04-20

## P0 — Blocking / Core Functionality Gaps

### P0-1 Rendering pipeline is incomplete — [#1](https://github.com/AlphaFoxz/term-bed/issues/1)

The rasterization system (`packages/native/src/render/system.zig`) has an empty widget processing loop. Double buffering and dirty tracking are implemented in `frame.zig`, but actual widget rendering (drawing text, borders, shadows into cells) does not happen.

- `rasterizationSystem()` iterates widgets but performs no work
- `skipRenderCell()` is an empty inline function
- The main render loop (`render.zig`) only fills a hard-coded background color

**Impact:** No widget is ever drawn to the terminal.

### P0-2 POSIX input handling is not implemented — [#2](https://github.com/AlphaFoxz/term-bed/issues/2)

`packages/native/src/input/posix_listener.zig` and `posix_mode.zig` are empty stubs. The library only works on Windows.

- No `read()` / `poll()` on stdin for Linux/macOS
- No termios raw-mode setup
- No ANSI escape parsing for POSIX

**Impact:** The library is Windows-only.

### P0-3 Text component textPtr is commented out — [#3](https://github.com/AlphaFoxz/term-bed/issues/3)

In `packages/lib/src/extern/widgets/TuiWidgetEntity.ts`, the text component's pointer field (`textPtr`) is commented out. Text data registered through the ECS is never transferred to the native side.

**Impact:** Text widgets store data in TS but the Zig renderer never sees it.

### P0-4 No event processing in main app loop — [#4](https://github.com/AlphaFoxz/term-bed/issues/4)

`packages/native/src/core/tui_app.zig` starts the render loop but never consumes events from the event bus. Events are emitted by input handlers but the application has no mechanism to dispatch them back to TS-level handlers.

**Impact:** Keyboard/mouse events are queued but never processed at the app level.

## P1 — Architecture / Design Issues

### P1-1 Event header size mismatch — [#6](https://github.com/AlphaFoxz/term-bed/issues/6)

The event header is defined as 16 bytes in Zig (`u32 + u32 + u64`) but the TS consumer code historically reads only 12 bytes. This causes misaligned reads on the TS side.

See: `packages/native/src/core/event_bus.zig` vs `packages/lib/src/extern/events.ts`

### P1-2 Global singleton event bus — [#7](https://github.com/AlphaFoxz/term-bed/issues/7)

The event bus is a global variable (`global_bus` in `event_bus.zig`). Only one instance can exist per process. This prevents multi-app scenarios and makes testing difficult.

### P1-3 Remove stale files from native source tree — [#5](https://github.com/AlphaFoxz/term-bed/issues/5)

Several files should be removed from `packages/native/src/`:

| File                     | Reason                                     |
|--------------------------|--------------------------------------------|
| `render_bak.zig`         | Backup of render module, no longer needed  |
| `core/context_demo.zig`  | Demo/unused file                           |
| `core/event_bus_try.zig` | Experimental alternative event bus         |
| `core/widgets.zig`       | Empty module; real code is in `widgets/`   |

## P2 — Code Quality / DX Issues

### P2-1 Heavy use of `any` types — [#9](https://github.com/AlphaFoxz/term-bed/issues/9)

Multiple files use `any` and `Record<string, any>` for event payloads and component data. This bypasses TypeScript's type safety.

Key locations:
- `packages/lib/src/events/types.ts` — event constructors accept `Record<string, any>`
- `packages/lib/src/extern/widgets/EcsManager.ts` — component registration uses unsafe casts

### P2-2 Misc code quality issues — [#16](https://github.com/AlphaFoxz/term-bed/issues/16)

- `#latestTick` declared but never read — `packages/lib/src/widgets/FrameRateWatcher.ts`
- Logger constructs new `timestampString()` in `appendFile` instead of reusing cached value — `packages/lib/src/common/logger.ts`
- `fetchDllPath()` has TODO for checking OS `PATH` env var — `packages/lib/src/utils/ffi.ts`
- Hard-coded background color `0x7F60FE` — `packages/native/src/render.zig`
- XXX comment about binary search — `packages/native/src/core/tui_app.zig:43`

## P3 — Test Coverage Gaps

### P3-1 Missing test coverage for core modules — [#8](https://github.com/AlphaFoxz/term-bed/issues/8)

- Widget system (`TuiWidgetEntity`, `EcsManager`)
- Event bus consumption (`EVENT_BUS.start/stop/on`)
- App lifecycle (`TuiApp.create/start/stop`)
- FFI integration end-to-end

All existing tests are unit tests. There are no integration tests that verify the Zig ↔ TypeScript FFI boundary works correctly end-to-end.
