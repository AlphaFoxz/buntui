# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**term-bed** is a cross-platform Terminal User Interface (TUI) framework that combines Zig (performance-critical native backend) with TypeScript (high-level API and application layer). The architecture uses FFI (Foreign Function Interface) to bridge Zig and TypeScript, leveraging Bun's native FFI capabilities.

### Hybrid Architecture

- **packages/native/**: Zig-based rendering engine, event handling, and terminal control
- **packages/lib/**: TypeScript framework with component-based widget system and Vue reactivity
- **packages/playground/**: Demo application showcasing framework capabilities

The Zig code exports C-compatible functions that are consumed by TypeScript via Bun's `dlopen()` FFI, creating a seamless boundary between performance-critical operations and developer-friendly API.

## Development Commands

### Building the Project

The build system uses topological sorting to handle inter-package dependencies:

```bash
# Build all packages in dependency order
bun run build

# Build individual packages
bun run --cwd ./packages/native build    # Zig build via `zig build`
bun run --cwd ./packages/lib build        # TypeScript build with version sync
bun run --cwd ./packages/playground build # TypeScript build with version sync
```

The root `build` command runs version sync first, then executes `scripts/build.ts` which:
1. Scans all packages in `packages/`
2. Builds a dependency graph from package.json dependencies
3. Topologically sorts packages
4. Runs `bun run build` in each package in dependency order

### Development

```bash
# Run the playground demo application
bun run dev

# Run tests in the lib package
bun run --cwd ./packages/lib test

# Synchronize versions across all packages
bun run sync
```

### Linting

The project uses **XO** with TypeScript configuration. See `xo.config.ts` for rules.

## Architecture Patterns

### Zig/TypeScript FFI Boundary

**Native exports (Zig)** are C ABI compatible functions defined in `packages/native/src/`:
- Terminal control and ANSI escape sequences
- Event system (keyboard, mouse, wheel events)
- Rasterization and frame buffering
- Memory management

**TypeScript bindings** use Bun's FFI:
```typescript
const lib = dlopen(fetchDllPath(), {
  renderFrame: {returns: FFIType.void, args: [FFIType.pointer, FFIType.pointer]},
  event_bus_emit: {returns: FFIType.c_int, args: [FFIType.u16, FFIType.cstring, FFIType.usize]},
});
```

The FFI bindings are typically in `packages/lib/src/extern/` and handle:
- Loading the native library (DLL/dylib/so)
- Type safety between Zig and TypeScript
- Memory management across the boundary

### Component System (TypeScript)

The framework uses an Entity-Component-System (ECS) pattern:

- **TuiApp**: Main application controller in `packages/lib/src/app/`
- **TuiScene**: Scene containers for organizing widgets
- **Widgets**: Reusable UI components in `packages/lib/src/widgets/`
- **Event Bus**: Reactive event system in `packages/lib/src/events/`

State management uses **Vue's reactivity system** (`@vue/reactivity`) integrated with a custom event bus for type-safe event handling.

### Rendering Pipeline (Zig)

The native rendering engine in `packages/native/src/render/` implements:
- **Double Buffering**: Separate current and next frame buffers
- **Dirty Tracking**: Only redraws changed characters for performance
- **ANSI-based Rendering**: Terminal output via escape sequences
- **Rasterization**: Character-based rendering with efficient diffing

Event handling in `packages/native/src/input/` manages keyboard, mouse, and wheel events with an efficient pooling mechanism.

## Coding Conventions

### Zig Naming Rules

From `README.md` - strictly enforced:
- **Functions**: camelCase with paired lifecycle methods
  - `createObject()` / `destroyObject()`
  - `initSource()` / `deinitSource()`
  - `openStreaming()` / `closeStreaming()`
  - `connect()` / `disconnect()`
  - `lock()` / `unlock()`
  - `allocOne()` / `freeArr()` / `destroyOne()`
  - `register()` / `unregister()`
  - `load()` / `unload()`
  - `start()` / `stop()`
  - `enter()` / `exit()`
- **Local variables**: snake_case
- **Global variables**: SCREAMING_SNAKE_CASE
- **Structs**: PascalCase

### TypeScript/Null Philosophy

From `README.md` - strict differentiation:
- **`undefined`**: Technical absence (pending requests, lazy loading, not ready yet due to technical reasons)
- **`null`**: Business logic null value (explicitly part of the domain model)

### XO Linting Rules

Key rules from `xo.config.ts`:
- Use `Uint8Array` instead of `Buffer`
- Use `Record<string, unknown>` instead of `object` type
- Use `TuiDataViewWrapper` instead of `DataView` (FFI safety)
- camelCase or UPPER_CASE for variables (underscores allowed)
- Flexible filename casing: kebab-case, camelCase, or PascalCase

## Build System Details

### Native Package Build

The `native` package uses Zig's build system (`zig build`). The compiled binary output is placed in `zig-out/` and must be loadable by Bun's FFI.

### Library Sync Scripts

Both `lib` and `playground` packages have a sync step:
```bash
bun run ./scripts/sync.ts  # Sync versions or generated files
```

The root `sync` command (`scripts/sync-version.ts`) propagates the root package version to all workspace packages to maintain version consistency.

## Memory Management

- **Zig**: Uses RAII patterns with explicit paired create/destroy functions
- **TypeScript**: Reference counting for FFI objects to manage native memory lifecycle
- **Custom Allocators**: Global allocator in Zig for predictable memory behavior

## Testing

Tests are located in `packages/lib/` and run via:
```bash
bun run --cwd ./packages/lib test
```

The project uses Bun's built-in test runner (`bun test`).

## Key Files Reference

- **Root scripts**: Build automation and version synchronization
- **global.d.ts**: Shared TypeScript declarations
- **xo.config.ts**: Linting configuration with FFI safety rules
- **packages/native/src/lib.zig**: Native exports and FFI interface
- **packages/lib/src/extern/**: FFI bindings and native library loading
- **packages/lib/src/app/**: TuiApp and scene management
- **packages/lib/src/events/**: Event bus and event types
- **packages/lib/src/widgets/**: Widget components
