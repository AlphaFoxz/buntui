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

Inside FFI export wrappers, catch errors and return C-compatible status codes:
```zig
pub export fn event_bus_emit(event_type: u16, data_ptr: [*]const u8, len: usize) c_int {
    if (!initialized) return -1;
    global_bus.emit(event_type, data) catch return -2;
    return 0;
}
```

## FFI Export Pattern

All exported functions live in `src/lib.zig` as thin wrappers:

```zig
// lib.zig
pub export fn startApp() void {
    return tui_app.startApp();
}
```

The actual logic must be in a separate module. `lib.zig` only does delegation, never business logic.

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

## Zig 0.16 Windows API

Zig 0.16 removed many Win32 wrappers from `std.os.windows.kernel32`. Follow these rules:

### BOOL is an enum
```zig
// Correct:
if (result == .FALSE) { ... }
if (result != .TRUE) { ... }

// Wrong (will not compile):
if (result == 0) { ... }
if (result == windows.FALSE) { ... }
```

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
Use comptime guards for platform-specific files:
```zig
comptime {
    if (builtin.os.tag != .windows) {
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
