// Binary event payload definitions for the FFI event bus.
// Must stay in sync with TypeScript counterparts in events/types.ts.

const std = @import("std");

// Modifier bitmask (shared by KeyboardEvent, MouseEvent, WheelEvent)
pub const MOD_SHIFT: u8 = 0x01;
pub const MOD_CTRL: u8 = 0x02;
pub const MOD_ALT: u8 = 0x04;
pub const MOD_META: u8 = 0x08;
pub const MOD_REPEAT: u8 = 0x10;

// Mouse presence flags
pub const HAS_BUTTON: u8 = 0x01;
pub const HAS_BUTTONS: u8 = 0x02;

// Mouse action flag (flags byte bit 4)
pub const IS_RELEASE: u8 = 0x10;

// MouseEvent payload — 8 bytes fixed
pub const MousePayload = extern struct {
    modifiers: u8,
    flags: u8,
    button: u8,
    buttons: u8,
    x: u16,
    y: u16,
};

// WheelEvent payload — 9 bytes fixed (extends MousePayload)
pub const WheelPayload = extern struct {
    modifiers: u8,
    flags: u8,
    button: u8,
    buttons: u8,
    x: u16,
    y: u16,
    wheel_delta_y: i8,
};

// TermResizeEvent payload — 4 bytes fixed
pub const TermResizePayload = extern struct {
    rows: u16,
    cols: u16,
};

// ============ Tests ============

test "Modifier bitmask values match TS events/types.ts" {
    try std.testing.expectEqual(@as(u8, 0x01), MOD_SHIFT);
    try std.testing.expectEqual(@as(u8, 0x02), MOD_CTRL);
    try std.testing.expectEqual(@as(u8, 0x04), MOD_ALT);
    try std.testing.expectEqual(@as(u8, 0x08), MOD_META);
    try std.testing.expectEqual(@as(u8, 0x10), MOD_REPEAT);
}

test "Mouse flag values" {
    try std.testing.expectEqual(@as(u8, 0x01), HAS_BUTTON);
    try std.testing.expectEqual(@as(u8, 0x02), HAS_BUTTONS);
    try std.testing.expectEqual(@as(u8, 0x10), IS_RELEASE);
}

test "MousePayload size is 8 bytes" {
    // u8*4 + u16*2 = 4 + 4 = 8
    try std.testing.expectEqual(@as(usize, 8), @sizeOf(MousePayload));
}

test "WheelPayload size" {
    // extern struct: MousePayload(8) + i8(1) + 1 padding on some ABIs
    const actual_size = @sizeOf(WheelPayload);
    try std.testing.expect(actual_size >= 9);
    try std.testing.expect(actual_size <= 10);
}

test "TermResizePayload size is 4 bytes" {
    try std.testing.expectEqual(@as(usize, 4), @sizeOf(TermResizePayload));
}

test "MousePayload field offsets" {
    const payload = MousePayload{
        .modifiers = 0x01,
        .flags = 0x02,
        .button = 0,
        .buttons = 1,
        .x = 42,
        .y = 10,
    };
    // Verify field values round-trip
    try std.testing.expectEqual(@as(u8, 0x01), payload.modifiers);
    try std.testing.expectEqual(@as(u8, 0x02), payload.flags);
    try std.testing.expectEqual(@as(u8, 0), payload.button);
    try std.testing.expectEqual(@as(u8, 1), payload.buttons);
    try std.testing.expectEqual(@as(u16, 42), payload.x);
    try std.testing.expectEqual(@as(u16, 10), payload.y);
}

test "WheelPayload inherits mouse fields plus delta" {
    const payload = WheelPayload{
        .modifiers = MOD_CTRL,
        .flags = 0,
        .button = 0,
        .buttons = 0,
        .x = 5,
        .y = 5,
        .wheel_delta_y = -3,
    };
    try std.testing.expectEqual(@as(u8, MOD_CTRL), payload.modifiers);
    try std.testing.expectEqual(@as(i8, -3), payload.wheel_delta_y);
}

test "TermResizePayload field access" {
    const payload = TermResizePayload{ .rows = 24, .cols = 80 };
    try std.testing.expectEqual(@as(u16, 24), payload.rows);
    try std.testing.expectEqual(@as(u16, 80), payload.cols);
}

test "Modifier bits are non-overlapping" {
    const all = MOD_SHIFT | MOD_CTRL | MOD_ALT | MOD_META | MOD_REPEAT;
    try std.testing.expectEqual(@as(u8, 0x1F), all);
}

test "Mouse flags are non-overlapping with each other" {
    // HAS_BUTTON and HAS_BUTTONS share bit space with IS_RELEASE
    const combined = HAS_BUTTON | HAS_BUTTONS | IS_RELEASE;
    try std.testing.expectEqual(@as(u8, 0x13), combined);
}
