# TypeScript Code Quality Audit

Date: 2026-05-20 (updated)

## 1. Design Issues

### 1.1 Hardcoded global 'q' quit handler

**File:** `packages/core/src/app/TuiApp.ts:81-87`

Every TUI app unconditionally quits when 'q' is pressed, regardless of focus state. Typing 'q' in an input field also quits the app. No way to disable or configure.

```ts
EVENT_BUS.on(TuiEventType.KeyboardEvent, data => {
  if (data.key === 'q' || data.key === 'Q') {
    setTimeout(() => { this.stop(); });
  }
});
```

**Fix:** Make configurable via options (e.g., `quitKey?: string | false`), or remove and let application code register its own quit handler.

### 1.2 ~~ScrollBoxWidget mutates child rect during render~~ — Fixed

**File:** `packages/core/src/widgets/scroll-box/ScrollBoxWidget.ts:275-316`

#### Problem

`emitDrawCommands` temporarily overwrote a child's actual rect with clamped coordinates, called `child.emitDrawCommands(buffer)`, then attempted to restore the original rect. This caused:

1. **Exception leaves child in corrupted state** — if `emitDrawCommands` throws, the child retains the clamped rect permanently.
2. **Side-effect cascade** — `updateRect` sets `#layoutDirty = true` on BoxWidget children, triggering unnecessary full subtree re-layouts every frame.
3. **`propagatePositionDelta` during render** — shifts grandchildren to wrong positions during the clamp window.
4. **Negative width/height** — when `childX` is far negative, `childW - (clampedX - childX)` can produce negative dimensions.

#### Root Cause

The DrawList binary protocol encoded x/y coordinates as U16, so negative positions (from scrolled-out-of-viewport children) caused unsigned overflow. The clamp-restore was a workaround to keep values non-negative.

#### Fix applied

Changed the DrawList coordinate encoding from U16 to I16 for position fields (x, y), while keeping U16 for size fields (width, height):

- **TS** (`DrawListBuffer.ts`): `setUint16` → `setInt16` for all x/y position fields across all drawing commands.
- **Zig** (`typedef.zig`): `TuiScale` changed from `u16` to `i16`, propagating signed coordinates throughout the rasterizer, clip stack, and presenter.
- **Zig** (`binary.zig`): added `readI16` helper.
- **Zig** (`rasterizer.zig`): all x/y reads use `readI16`; `writeCell`/`blendCellBg` add `x < 0 or y < 0` guard before usize cast.
- **Zig** (`frame.zig`, `presenter.zig`, `tui_context.zig`): widened size multiplications to `usize`, cast loop bounds.
- **TS** (`ScrollBoxWidget.ts`): removed the entire clamp/restore block. Negative child coordinates now flow through the DrawList naturally — the viewport clip handles visual cropping.
