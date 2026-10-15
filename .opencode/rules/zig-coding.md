---
paths:
  - "packages/native/**"
---

# Zig Coding Rules

Rules for writing Zig code in packages/native/.

## Naming Conventions

- **Functions**: camelCase with paired lifecycle methods:
  `create`/`destroy`, `init`/`deinit`, `open`/`close`, `start`/`stop`,
  `enter`/`exit`, `lock`/`unlock`, `register`/`unregister`,
  `load`/`unload`, `alloc`/`free`
- **Local variables**: snake_case
- **Global variables**: SCREAMING_SNAKE_CASE
- **Types/Structs**: PascalCase
- **Constants**: SCREAMING_SNAKE_CASE

## Error Handling

Do not propagate Zig error unions across FFI. Use the helpers in `core/error.zig`:

- `outOfMemory()` -> logs error, exits with code 101
- `unsupportedOS()` -> logs error, exits with code 102
- `osApiError(msg)` -> logs error with message, exits with code 103
- `osApiErrorFmt(fmt, args)` -> logs formatted error with message, exits with code 103

Inside FFI export wrappers, catch errors and return C-compatible status codes:
```zig
pub export fn event_bus_emit(event_type: u16, data_ptr: [*]const u8, len: usize) c_int {
    if (!initialized) return -1;
    global_bus.emit(event_type, data) catch return -2;
    return 0;
}
```

## FFI Export Pattern

Most exported functions live in `src/lib.zig` as thin wrappers that delegate to other modules:

```zig
// lib.zig
pub export fn startApp() void {
    return tui_app.startApp();
}
```

The actual logic must be in a separate module. `lib.zig` should only delegate, never contain business logic. **Exceptions**:
- `setupLogger` performs inline C-string-to-Zig-string conversion (`alloc.dupe`) before delegating to `logger.load()`.
- The 5 ANSI utility exports at the bottom of `lib.zig` (`resetStyle`, `showCursor`, `hideCursor`, `clearScreen`, `drawText`) contain inline init+writer boilerplate and delegate actual ANSI output to the `ansi_util` module. These are not consumed by TS via FFI.

## Global State Pattern

Use the `undefined + initialized` pattern for global state:

```zig
var global_bus: EventBus = undefined;
var initialized: bool = false;

pub fn event_bus_setup() void {
    if (!initialized) {
        global_bus = EventBus.init();
        initialized = true;
    }
}
```

Guard all functions that access the global state with `if (!initialized)` checks.

## Zig 0.17 API Notes

Target is Zig 0.17.0 (`minimum_zig_version` in `build.zig.zon`). Each Zig minor release has breaking changes — do not assume 0.16 knowledge carries over. Verified against the 0.17.0 std source.

### Banned / deprecated APIs — do not use in new code
- `std.fmt.allocPrint` (deprecated) — use `alloc.print(fmt, args)` (`mem.Allocator.print`).
- `std.heap.DebugAllocator` (deprecated) — use `std.heap.SafeAllocator` (not generic; `SafeAllocator.init(backing_allocator, .{})`, `.deinit()` reports leaks). See `core/glo_alloc.zig` for the project's global instance pattern.
- `builtin.os.tag` / `builtin.cpu` / `builtin.abi` (deprecated, removed in 0.18) — use `builtin.target.os.tag`, `builtin.target.cpu`, etc.
- `@intFromEnum` / `@enumFromInt` (deprecated) — use `@backingInt` / `@fromBackingInt`.
- `@cImport` — removed entirely; C translation now requires an external translate-c package.

### 0.17 syntax removals (compile errors)
- Array multiplication `a ** b` — removed; use `@splat`.
- `errdefer |err| capture` — removed; restructure so the outer scope observes errors via `catch |err|`.
- `void{}` and the `i0` type — removed.

### Silent-breaking change
- `@bitCast` now operates on the logical bit representation (endian-agnostic) and **disallows casts involving extern structs/unions**. For arrays/vectors this can change behavior **without a compile error** — audit any `@bitCast` on arrays or vectors.

### Misc
- `@hasDecl` returns `true` only for `pub` declarations.
- Build system is split into configurer + maker processes; configuration is cached. Don't run commands as side effects in `build.zig`.

## Zig 0.17 Windows API

Zig 0.17 keeps the Win32 bindings minimal: many wrappers were removed from `std.os.windows.kernel32` (this started in 0.16 and has not been restored). Follow these rules:

### BOOL is an enum
```zig
// std.os.windows.BOOL — compare with .FALSE/.TRUE:
if (result == .FALSE) { ... }
if (result != .TRUE) { ... }

// Wrong (will not compile):
if (result == 0) { ... }
if (result == windows.FALSE) { ... }
```

Note: `typedef.Bool` (custom enum in `core/typedef.zig`) uses `.False`/`.True` (PascalCase), which is different from `std.os.windows.BOOL`.

### Declare Win32 functions directly
```zig
extern "kernel32" fn GetStdHandle(nStdHandle: u32) callconv(.winapi) ?windows.HANDLE;

pub extern "kernel32" fn ReadConsoleInputW(
    hConsoleInput: ?windows.HANDLE,
    lpBuffer: [*]INPUT_RECORD,
    nLength: u32,
    lpNumberOfEventsRead: ?*u32,
) callconv(.winapi) windows.BOOL;
```

Do not rely on `std.os.windows.kernel32` for anything beyond basic types.

### Platform guards
Use comptime guards for platform-specific files (note: `builtin.target.os.tag`, not the deprecated `builtin.os.tag`):
```zig
comptime {
    if (builtin.target.os.tag != .windows) {
        @compileError("Unsupported OS: Not Windows");
    }
}
```

## Logging

Use the logger module (`core/logger.zig`):

- `logger.logDebug(msg)` / `logger.logDebugFmt(fmt, args)` - verbose debugging
- `logger.logInfo(msg)` / `logger.logInfoFmt(fmt, args)` - informational
- `logger.logWarning(msg)` / `logger.logWarningFmt(fmt, args)` - warnings
- `logger.logError(msg)` / `logger.logErrorFmt(fmt, args)` - errors

Do not use `std.debug.print` for logging in production code.

## Imports

Use relative imports within the native package:
```zig
const logger = @import("./core/logger.zig");
const event_bus = @import("./core/event_bus.zig");
```

Use `@import("std")` for standard library only.
