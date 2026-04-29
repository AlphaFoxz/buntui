# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**buntui** is a cross-platform Terminal User Interface (TUI) framework combining Zig (native backend) with TypeScript (high-level API). The architecture bridges the two via FFI using Bun's `dlopen()` — Zig exports C ABI functions, TypeScript consumes them through type-safe bindings.

This project uses **Bun exclusively** as its runtime, package manager, and build tool. Do not use `npm`, `npx`, `yarn`, or `pnpm`. All commands use `bun` (e.g., `bun install`, `bun run`, `bun test`).

### Monorepo Structure

- **packages/native/** — Zig rendering engine, event handling, terminal control (compiled to shared library)
- **packages/core/** — TypeScript runtime framework with ECS-based widget system and Vue reactivity
- **packages/compiler/** — SFC compiler using Vue compiler-core for template/script compilation
- **packages/playground/** — Demo application (`bun run dev`)

### Compiler Pipeline

The compiler transforms `.vue` SFC files into TUI TypeScript modules:

1. **parse** (`compiler/src/parse.ts`) — Parses SFC source into blocks (template, script, scriptSetup) via `@vue/compiler-sfc`
2. **analyzeBindings** (`compiler/src/script/analyzeBindings.ts`) — Extracts reactive bindings from `<script setup>`
3. **transform** (`compiler/src/template/transform.ts`) — Converts template AST to TUI render tree
4. **generate** (`compiler/src/template/codegen.ts`) — Emits TypeScript module code from the render tree

The compile entry point (`compiler/src/compile.ts`) orchestrates: parse → analyze script → transform template → codegen.

## Development Commands

```bash
bun run build                                    # Build all packages in dependency order (sync → native → core → compiler → playground)
bun run --cwd ./packages/native build            # zig build only
bun run --cwd ./packages/core build              # Sync native binary + build TS
bun run --cwd ./packages/compiler build          # Build SFC compiler
bun run --cwd ./packages/playground build        # Sync native binary + build TS
bun run dev                                      # Run playground demo (bun run ./main.ts)
bun run --cwd ./packages/core test               # Run all core tests
bun test packages/core/src/some/__tests__/file.test.ts  # Run a single test
bun run sync                                     # Propagate root version to all packages
```

There is no dedicated lint command in package.json. XO is a devDependency for programmatic use.

### Build Pipeline

1. `scripts/sync-version.ts` propagates root `version` to all workspace `package.json` files
2. `scripts/build.ts` topologically sorts packages by their dependencies and runs `bun run build` in each
3. The `core` sync script (`packages/core/scripts/sync.ts`) copies the native binary to `packages/core/src/utils/`; the `playground` sync script (`packages/playground/scripts/sync.ts`) copies it to `packages/playground/`

### Native Build

The `native` package uses `zig build` (`build.zig`). It produces a shared library (`buntui.dll`/`.dylib`/`.so`) in `zig-out/bin/`. Default optimization is `Debug`.

## Architecture

### Zig/TypeScript FFI Boundary

**Zig side** (`packages/native/src/lib.zig`): All exports are `pub export fn` with C ABI compatibility. Exports cover:
- App lifecycle: `setupLogger`, `startApp`, `stopApp`, `createScene`, `destroyScene`
- Rendering: `renderDrawList`, `detectTermSize`
- Event bus: `event_bus_setup`, `event_bus_emit`, `event_bus_poll`, `event_bus_commit`, `event_bus_stats`
- ANSI helpers: `resetStyle`, `showCursor`, `hideCursor`, `clearScreen`, `drawText`

**TypeScript side** (`packages/core/src/extern/`): Bun FFI bindings via `dlopen()`:
- `extern/app/lib.ts` — App lifecycle, scene, render, and DrawList FFI bindings
- `extern/events.ts` — Event bus FFI bindings
- `extern/ansi.ts` — ANSI helper FFI bindings
- `extern/TuiDataViewWrapper.ts` — Safe DataView wrapper for FFI memory access (required by XO lint rules over native `DataView`)

The FFI type mapping uses branded types from `global.d.ts` (`U8`, `U16`, `U32`, `I8`, `I16`, `I32`, `BOOL`, etc.) to represent C numeric types in TypeScript.

### Event System

The event bus (`packages/native/src/core/event_bus.zig`) is a lock-free SPSC ring queue:
- Fixed-size slots (256 bytes each), 1024-slot ring buffer
- 16-byte binary header per event: `event_type` (u32) + `payload_len` (u32) + `sequence` (u64)
- Flow: `emit` → `poll` → `commit` (single-producer on Zig side, single-consumer on TS side)
- Event payloads are JSON strings emitted by input handlers, deserialized on the TS side
- Event types: `KeyboardEvent` (1), `MouseEvent` (2), `WheelEvent` (3) — matching Web API signatures
- Note: `event_bus_emit` FFI takes `u16` for event_type, but `EventHeader` stores it as `u32` (widened on write)

### Component System (TypeScript)

Entity-Component-System pattern:
- **TuiWidgetEntity**: Base entity in `packages/core/src/extern/widgets/`
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

The project defines a custom `Bool` type in `core/typedef.zig` as `enum(u8) { False = 0, True = 1 }` — use `.False`/`.True` for comparison, not integer literals. This is separate from the Win32 `BOOL`.

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

## Issue Tracking

This project uses GitHub Issues + Milestones for tracking. Use `gh` CLI to stay in sync.

**Labels:** `P0` (blocking), `P1` (architecture), `P2` (code quality), `P3` (test coverage), `native`, `core`, `compiler`, `roadmap`

**Milestones:**

- Phase 0 — Make the core work
- Phase 1 — Cross-platform support
- Phase 2 — Widget library
- Phase 3 — Reactive binding layer
- Phase 4 — Declarative API (SFC)
- Phase 5 — Ecosystem
- Triage — Issues to prioritize

### Sync workflow

When discovering a new bug or design issue: create an issue via `gh issue create` with appropriate `--label` and `--milestone`. When fixing an issue: close it via `gh issue close`. Issue content should be bilingual (English first, Chinese after a `---` separator).

```bash
# Check current issues
gh issue list --state open

# Check issues by milestone
gh issue list --milestone "Phase 0 — Make the core work"

# Create a new issue
gh issue create --title "..." --label "P0,native" --milestone "Phase 0 — Make the core work"

# Close after fix
gh issue close <number>
```
