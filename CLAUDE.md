# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**term-bed** is a cross-platform Terminal User Interface (TUI) framework combining Zig (native backend) with TypeScript (high-level API). The architecture bridges the two via FFI using Bun's `dlopen()` — Zig exports C ABI functions, TypeScript consumes them through type-safe bindings.

### Monorepo Structure

- **packages/native/** — Zig rendering engine, event handling, terminal control (compiled to shared library)
- **packages/lib/** — TypeScript framework with ECS-based widget system and Vue reactivity
- **packages/playground/** — Demo application

## Development Commands

```bash
bun run build                                    # Build all packages in dependency order (sync → native → lib → playground)
bun run --cwd ./packages/native build            # zig build only
bun run --cwd ./packages/lib build               # Sync native binary + build TS
bun run --cwd ./packages/playground build        # Sync native binary + build TS
bun run dev                                      # Run playground demo (bun run ./main.ts)
bun run --cwd ./packages/lib test                # Run tests (bun test)
bun run sync                                     # Propagate root version to all packages
```

There is no dedicated lint command in package.json. XO is a devDependency for programmatic use.

### Build Pipeline

1. `scripts/sync-version.ts` propagates root `version` to all workspace `package.json` files
2. `scripts/build.ts` topologically sorts packages by their dependencies and runs `bun run build` in each
3. The `lib` and `playground` sync scripts (`scripts/sync.ts`) copy the compiled native binary from `packages/native/zig-out/bin/` to their own directories (`.dll`/`.dylib`/`.so` + `.pdb`)

### Native Build

The `native` package uses `zig build` (`build.zig`). It produces a shared library (`term_bed.dll`/`.dylib`/`.so`) in `zig-out/bin/`. Default optimization is `Debug`.

## Architecture

### Zig/TypeScript FFI Boundary

**Zig side** (`packages/native/src/lib.zig`): All exports are `pub export fn` with C ABI compatibility. Exports cover:
- App lifecycle: `startApp`, `stopApp`, `createScene`, `destroyScene`
- Widget management: `mountWidgetEntity`, `unmountWidgetEntity`
- Rendering: `renderFrame`, `detectTermSize`
- Event bus: `event_bus_setup`, `event_bus_emit`, `event_bus_poll`, `event_bus_commit`
- ANSI helpers: `resetStyle`, `showCursor`, `hideCursor`, `clearScreen`, `drawText`

**TypeScript side** (`packages/lib/src/extern/`): Bun FFI bindings via `dlopen()`:
- `extern/app/lib.ts` — App lifecycle, scene, and render FFI bindings
- `extern/events.ts` — Event bus FFI bindings
- `extern/TuiDataViewWrapper.ts` — Safe DataView wrapper for FFI memory access (required by XO lint rules over native `DataView`)

The FFI type mapping uses branded types from `global.d.ts` (`U8`, `U16`, `U32`, `I8`, `I16`, `I32`, `BOOL`, etc.) to represent C numeric types in TypeScript.

### Event System

The event bus (`packages/native/src/core/event_bus.zig`) is a lock-free SPSC ring queue:
- Fixed-size slots (256 bytes each), 1024-slot ring buffer
- 12-byte binary header per event: `event_type` (u32) + `payload_len` (u32) + `sequence` (u64)
- Flow: `emit` → `poll` → `commit` (single-producer on Zig side, single-consumer on TS side)
- Event payloads are JSON strings emitted by input handlers, deserialized on the TS side
- Event types: `KeyboardEvent` (1), `MouseEvent` (2), `WheelEvent` (3) — matching Web API signatures

### Component System (TypeScript)

Entity-Component-System pattern:
- **TuiWidgetEntity**: Base entity in `packages/lib/src/extern/widgets/`
- **Components**: Rect, Color, Style, Border, Shadow, Text attached to entities
- **TuiScene**: Widget container with mount/unmount lifecycle
- **TuiApp**: Application controller managing scenes and render loop
- State uses **Vue reactivity** (`@vue/reactivity`)

### Rendering Pipeline (Zig)

`packages/native/src/render/` implements:
- Double buffering with dirty tracking (only redraw changed characters)
- ANSI escape sequence rendering
- Platform-specific input in `packages/native/src/input/`: separate POSIX and Windows implementations

### Zig 0.16 Windows API Notes

Zig 0.16 removed many Win32 console wrappers from `std.os.windows.kernel32` (e.g., `GetStdHandle`, `SetConsoleMode`, `GetConsoleScreenBufferInfo`) and types like `CONSOLE_SCREEN_BUFFER_INFO`, `WAIT_OBJECT_0`. The `BOOL` type changed from an integer to an enum — compare with `.FALSE` instead of `windows.FALSE` or integer 0.

When new Win32 functions are needed, declare them directly as `extern "kernel32"` (matching the existing pattern for `ReadConsoleInputW` and `WaitForSingleObject` in `windows_listener.zig`).

## Coding Conventions

### Zig Naming Rules

Strictly enforced (from README.md):
- **Functions**: camelCase with **paired lifecycle methods**: `create`/`destroy`, `init`/`deinit`, `open`/`close`, `start`/`stop`, `enter`/`exit`, `lock`/`unlock`, `register`/`unregister`, `load`/`unload`, `alloc`/`free`
- **Local variables**: snake_case
- **Global variables**: SCREAMING_SNAKE_CASE
- **Structs**: PascalCase

### TypeScript Null Philosophy

Strict differentiation (from README.md):
- **`undefined`**: Technical absence — value not ready due to technical reasons (pending request, lazy loading)
- **`null`**: Business logic null — explicitly part of the domain model

### XO Linting Rules

Key rules from `xo.config.ts`:
- `Uint8Array` instead of `Buffer`
- `Record<string, unknown>` instead of `object`
- `TuiDataViewWrapper` instead of `DataView` (FFI safety)
- camelCase or UPPER_CASE for variables
- Filenames: kebab-case, camelCase, or PascalCase all allowed
- 2-space indentation
- Bitwise operators allowed (`no-bitwise: off`)
