---
paths:
  - "packages/core/src/draw_list/**"
  - "packages/core/src/widgets/**"
  - "packages/native/src/draw_list/**"
  - "packages/native/src/render/**"
---

# DrawList Rendering Pipeline

DrawList is the binary command buffer bridging TS widget state to Zig rendering. TS emits draw commands each frame, Zig rasterizes them.

## Adding a New Command Type

1. Add `DrawCmd` enum value in both `commands.zig` (Zig) and `types.ts` (TS)
2. Define payload struct in `commands.zig`
3. Add rasterization logic in `rasterizer.zig`
4. Add builder method to `DrawListBuffer.ts`

Unknown command types are skipped (`payload_len` allows parser to advance past them).

## Command Buffer Format

```
[Buffer Header: 8B] [Cmd Header: 8B] [Payload] [Cmd Header: 8B] [Payload] ...
```

- **Buffer Header** (8 bytes): magic `0x5442` (u16) + version (u8) + flags (u8) + reserved (u32)
- **Command Header** (8 bytes): cmd_type (u16) + flags (u16) + payload_len (u32)
- All multi-byte fields are little-endian. Commands are packed — no alignment padding.

## Command Categories

| Range       | Category          | Examples                                          |
|-------------|-------------------|---------------------------------------------------|
| 0x00-0x0F   | Frame state       | SetBackground, SetCursor, PushClip, SetEntityId   |
| 0x10-0x1F   | Drawing primitives| DrawRect, DrawText, DrawBorder, DrawShadow, DrawFill, DrawChar, DrawLine |
| 0x20-0x2F   | Terminal control  | SetTitle, ShowCursor, HideCursor, SetCursorMode   |
| 0x30-0x3F   | Sync update       | BeginSync, EndSync                                |
| 0x100-0x7FFF| Compound commands | Future: DrawProgressBar, DrawScrollView           |
| 0x8000-0xFFFF| User extensions  | Plugin system                                     |

## Key Files

- **Zig**: `packages/native/src/draw_list/` — commands.zig, clip_stack.zig, rasterizer.zig, draw_list.zig
- **TS**: `packages/core/src/draw_list/` — DrawListBuffer.ts (builder), types.ts (enums)
- **FFI**: `renderDrawList(ctx, buf_ptr, buf_len)` in lib.zig + extern/app/lib.ts

## Rendering Rules

- TuiScene sorts widgets by `zIndex` ascending, iterates calling `emitDrawCommands` — painter's algorithm.
- Scene wraps frame with `BeginSync`/`EndSync` and `HideCursor`.
- Zig maintains a 32-deep clip rectangle stack. `PushClip` intersects with current clip. `PopClip` restores.