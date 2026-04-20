# FFI Boundary Protocol

This document defines the protocol for Zig/TypeScript FFI communication. All changes crossing the FFI boundary must follow these rules.

## Type Mapping Table

| Zig Type     | Bun FFIType      | TS Branded Type | Size (64-bit) |
|--------------|-------------------|-----------------|---------------|
| `u8`         | `FFIType.u8`      | `U8`            | 1 byte        |
| `i8`         | `FFIType.i8`      | `I8`            | 1 byte        |
| `u16`        | `FFIType.u16`     | `U16`           | 2 bytes       |
| `i16`        | `FFIType.i16`     | `I16`           | 2 bytes       |
| `u32`        | `FFIType.u32`     | `U32`           | 4 bytes       |
| `i32`        | `FFIType.i32`     | `I32`           | 4 bytes       |
| `u64`        | `FFIType.uint64_t`| `U64`           | 8 bytes       |
| `i64`        | `FFIType.int64_t` | `I64`           | 8 bytes       |
| `usize`      | `FFIType.uint64_t`| -               | 8 bytes (64-bit) / 4 bytes (32-bit) |
| `c_int`      | `FFIType.i32`     | `I32`           | 4 bytes       |
| `bool` / `Bool` | `FFIType.u8`   | `BOOL`          | 1 byte (0=false, 1=true) |
| `*T` (pointer)| `FFIType.pointer` | `Pointer`      | 8 bytes (64-bit) |
| `[*:0]const u8` | `FFIType.cstring` | `Uint8Array` (via `toCstring()`) | variable |

## Memory Alignment Rules

`useOffsetCounter` (packages/lib/src/utils/ffi.ts) computes struct layout offsets:
- Each field's alignment = `min(fieldSize, pointerSize)` where pointerSize = 8 on 64-bit
- Padding is inserted before each field to satisfy alignment
- The total struct size is the sum of all fields + padding

When adding fields to FFI structs, always verify the TS offset matches the Zig `extern struct` layout.

## String Transfer

### TS -> Zig
- Use `toCstring()` (packages/lib/src/utils/ffi.ts) to convert a JS string to a null-terminated `Uint8Array`
- Zig receives as `[*:0]const u8`, read with `std.mem.span(cstr)`

### Zig -> TS
- Use `CString` from `bun:ffi` to read back: `new CString(ptr, 0, length).toString()`
- Helper: `cToString(ptr, length)` in packages/lib/src/utils/ffi.ts

## Pointer Transfer

- All FFI functions returning pointers must be wrapped with `assertPtr()` on the TS side
- Struct pointers are passed via the `CStruct` interface: objects expose a `readonly ptr: Pointer` property
- Never pass raw `ArrayBuffer` or `Uint8Array` where `Pointer` is expected; use `ptr()` from `bun:ffi`

## EventHeader Memory Layout (16 bytes)

```
Offset  Size  Field         Type
0       4     event_type    u32
4       4     payload_len   u32
8       8     sequence      u64
```

Total: 16 bytes. The TS side must read a full 16-byte header.

## Adding a New FFI Export

1. Implement the actual logic in the appropriate Zig module under `packages/native/src/`
2. Add a thin `pub export fn` wrapper in `packages/native/src/lib.zig` that delegates to the module
3. Add the FFI binding in the corresponding TS file under `packages/lib/src/extern/`
4. Ensure the `args` and `returns` FFIType exactly match the Zig signature
5. Wrap pointer returns with `assertPtr()`

## Known Issues

- `event_bus_emit` Zig param `len: usize` maps to `FFIType.uint64_t` in TS (correct on 64-bit, will break on 32-bit)
- Event header size mismatch documented in IMPROVEMENTS.md P0-1
