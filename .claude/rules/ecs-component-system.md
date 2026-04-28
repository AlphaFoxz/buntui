# Rendering Architecture (DrawList)

TS side manages widget state, generates draw commands each frame into a shared buffer, Zig consumes them for rendering.

## Frame Lifecycle

```
TS: widget tree → emitDrawCommands() → DrawListBuffer (shared ArrayBuffer)
    ↓ FFI: renderDrawList(ctx_ptr, buf_ptr, buf_len)
Zig: parse commands → rasterize to cell grid → diff → emit ANSI → flush
```

Synchronous per-frame call. No ring buffer — TS resets the buffer each frame, passes it to Zig, Zig processes and returns.

## Command Buffer Format

```
[Buffer Header: 8B] [Cmd Header: 8B] [Payload] [Cmd Header: 8B] [Payload] ...
```

**Buffer Header** (8 bytes): magic `0x5442` (u16) + version (u8) + flags (u8) + reserved (u32)

**Command Header** (8 bytes): cmd_type (u16) + flags (u16) + payload_len (u32)

All multi-byte fields are little-endian. Commands are packed — no alignment padding between them.

## Key Files

- **Zig**: `packages/native/src/draw_list/` — commands.zig (types), clip_stack.zig, rasterizer.zig, draw_list.zig (parse loop)
- **TS**: `packages/core/src/draw_list/` — DrawListBuffer.ts (builder), types.ts (enums)
- **FFI**: `renderDrawList(ctx, buf_ptr, buf_len)` in lib.zig + extern/app/lib.ts

## Command Categories

| Range       | Category          | Examples                              |
|-------------|-------------------|---------------------------------------|
| 0x00-0x0F   | Frame state       | SetBackground, PushClip, SetEntityId  |
| 0x10-0x1F   | Drawing primitives| DrawRect, DrawText, DrawBorder        |
| 0x20-0x2F   | Terminal control  | SetTitle, ShowCursor, HideCursor      |
| 0x30-0x3F   | Sync update       | BeginSync, EndSync                    |
| 0x100-0x7FFF| Compound commands | Future: DrawProgressBar, DrawScrollView |
| 0x8000-0xFFFF| User extensions  | Plugin system                         |

## Adding a New Command Type

1. Add `DrawCmd` enum value in both `commands.zig` (Zig) and `types.ts` (TS)
2. Define payload struct in `commands.zig`
3. Add rasterization logic in `rasterizer.zig`
4. Add builder method to `DrawListBuffer.ts`

Unknown command types are skipped (payload_len allows parser to advance past them).

## Widget Pattern

Each widget class has an `emitDrawCommands(buf: DrawListBuffer)` method:

```typescript
class TextWidget extends TuiWidgetEntity {
  override emitDrawCommands(buf: DrawListBuffer): void {
    const {rectX, rectY, rectWidth, rectHeight} = this.rect;
    const {colorFg, colorBg} = this.color;
    buf.pushClip(rectX, rectY, rectWidth, rectHeight);
    buf.drawRect(rectX, rectY, rectWidth, rectHeight, colorBg);
    buf.drawText(rectX, rectY, this.text, colorFg, colorBg);
    buf.popClip();
  }
}
```

TuiScene iterates widgets and calls `emitDrawCommands` on each. Z-ordering is painter's algorithm — traversal order determines draw order.

## Clip Stack

Zig maintains a 32-deep clip rectangle stack. `PushClip` intersects with current clip. `PopClip` restores. Used for window boundaries, scroll viewports, nested widgets.
