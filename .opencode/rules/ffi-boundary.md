# FFI Boundary Protocol

This document defines the protocol for Zig/TypeScript FFI communication.

## Type Mapping Table

| Zig Type     | Bun FFIType      | TS Branded Type | Size (64-bit) |
|--------------|-------------------|-----------------|---------------|
| `u8`         | `FFIType.u8`      | `U8`            | 1 byte        |
| `u16`        | `FFIType.u16`     | `U16`           | 2 bytes       |
| `u32`        | `FFIType.u32`     | `U32`           | 4 bytes       |
| `i32`        | `FFIType.i32`     | `I32`           | 4 bytes       |
| `u64`        | `FFIType.uint64_t`| `U64`           | 8 bytes       |
| `usize`      | `FFIType.uint64_t`| -               | 8 bytes (64-bit) |
| `bool` / `Bool` | `FFIType.u8`   | `BOOL`          | 1 byte (0=false, 1=true) |
| `*T` (pointer)| `FFIType.pointer` | `Pointer`      | 8 bytes (64-bit) |
| `[*:0]const u8` | `FFIType.cstring` | `Uint8Array` (via `toCstring()`) | variable |

## String Transfer

- **TS → Zig**: `toCstring()` converts JS string to null-terminated `Uint8Array`. Zig reads with `std.mem.span(cstr)`.
- **Zig → TS**: `new CString(ptr, 0, length).toString()` or helper `cToString(ptr, len)`.

## Pointer Transfer

- Struct pointers passed via `CStruct` interface (`readonly ptr: Pointer`)
- Never pass raw `ArrayBuffer` or `Uint8Array` where `Pointer` is expected; use `ptr()` from `bun:ffi`

## FFI Exports

**Rendering** (DrawList):
- `renderDrawList(ctx: *TuiContext, buf_ptr: [*]const u8, buf_len: usize)` — main render call

**Lifecycle**:
- `setupLogger`, `startApp`, `stopApp`, `detectTermSize`

**Event bus** (TS-side FFI bindings exist only for `poll`/`commit`; `setup`, `emit`, and `stats` are Zig-internal):
- `event_bus_setup`, `event_bus_emit`, `event_bus_poll`, `event_bus_commit`, `event_bus_stats`

**ANSI utilities** (not consumed by TS via FFI; inline logic in lib.zig):
- `resetStyle`, `showCursor`, `hideCursor`, `clearScreen`, `drawText`

Event payloads are binary (not JSON). Event types: KeyboardEvent (1), MouseEvent (2), WheelEvent (3), TermResizeEvent (4).

## Adding a New FFI Export

1. Implement logic in the appropriate Zig module under `packages/native/src/`
2. Add a thin `pub export fn` wrapper in `packages/native/src/lib.zig`
3. Add the FFI binding in the corresponding TS file under `packages/core/src/extern/`
4. Ensure `args` and `returns` FFIType exactly match the Zig signature
