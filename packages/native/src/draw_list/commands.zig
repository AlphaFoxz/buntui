const std = @import("std");
const TuiScale = @import("../core/typedef.zig").TuiScale;

// ============ Buffer Header ============

pub const BUFFER_HEADER_SIZE: usize = 8;
pub const BUFFER_MAGIC: u16 = 0x5442; // "TB" little-endian
pub const BUFFER_VERSION: u8 = 1;

// ============ Command Header ============

pub const CMD_HEADER_SIZE: usize = 8;

pub const CmdHeader = extern struct {
    cmd_type: u16,
    flags: u16,
    payload_len: u32,
};

// ============ Command Types ============

pub const DrawCmd = enum(u16) {
    // Frame state (0x00-0x0F)
    SetBackground = 0x0001,
    SetCursor = 0x0002,
    PushClip = 0x0003,
    PopClip = 0x0004,
    SetEntityId = 0x0005,

    // Drawing primitives (0x10-0x1F)
    DrawRect = 0x0010,
    DrawText = 0x0011,
    DrawBorder = 0x0012,
    DrawShadow = 0x0013,
    DrawFill = 0x0014,
    DrawChar = 0x0015,
    DrawLine = 0x0016,

    // Terminal control (0x20-0x2F)
    SetTitle = 0x0020,
    ShowCursor = 0x0021,
    HideCursor = 0x0022,
    SetCursorMode = 0x0023,

    // Synchronized update (0x30-0x3F)
    BeginSync = 0x0030,
    EndSync = 0x0031,
};

pub fn drawCmdFromInt(value: u16) ?DrawCmd {
    inline for (std.meta.fields(DrawCmd)) |field| {
        if (field.value == value) {
            return @enumFromInt(value);
        }
    }
    return null;
}

// ============ Style Enums ============

pub const BorderStyle = enum(u8) {
    none = 0,
    solid = 1,
    double = 2,
    rounded = 3,
    bold = 4,
    dashed = 5,
    dotted = 6,
    outset_bold = 7,
    outset_double = 8,
};

pub const LineStyle = enum(u8) {
    thin = 0,
    double = 1,
    bold = 2,
    dashed = 3,
    dotted = 4,
};

// ============ Payload Structs ============

pub const SetBackgroundPayload = extern struct {
    bg_rgba: u32,
};

pub const SetCursorPayload = extern struct {
    x: TuiScale,
    y: TuiScale,
};

pub const PushClipPayload = extern struct {
    x: TuiScale,
    y: TuiScale,
    width: TuiScale,
    height: TuiScale,
};

pub const SetEntityIdPayload = extern struct {
    entity_id: u64,
};

pub const DrawRectPayload = extern struct {
    x: TuiScale,
    y: TuiScale,
    width: TuiScale,
    height: TuiScale,
    bg_rgba: u32,
    fill_char: u16,
    font_style: u16,
};

pub const DrawTextFixedPayload = extern struct {
    x: TuiScale,
    y: TuiScale,
    fg_rgba: u32,
    bg_rgba: u32,
    font_style: u16,
    text_len: u16,
    // Followed by text_len bytes of UTF-8 data
};

pub const DrawBorderPayload = extern struct {
    x: TuiScale,
    y: TuiScale,
    width: TuiScale,
    height: TuiScale,
    color_rgba: u32,
    border_style: u8,
    sides: u8, // bit0=top, bit1=right, bit2=bottom, bit3=left
    reserved: u16,
};

pub const DrawShadowPayload = extern struct {
    x: TuiScale,
    y: TuiScale,
    width: TuiScale,
    height: TuiScale,
    offset_x: TuiScale,
    offset_y: TuiScale,
    color_rgba: u32,
};

pub const DrawFillPayload = extern struct {
    x: TuiScale,
    y: TuiScale,
    width: TuiScale,
    height: TuiScale,
    rgba: u32,
};

pub const DrawCharPayload = extern struct {
    x: TuiScale,
    y: TuiScale,
    fg_rgba: u32,
    bg_rgba: u32,
    char: u16, // UCS-2 codepoint
    font_style: u16,
};

pub const DrawLinePayload = extern struct {
    x: TuiScale,
    y: TuiScale,
    length: u16,
    direction: u16, // 0=horizontal, 1=vertical
    color_rgba: u32,
    line_style: u8,
    reserved: [3]u8,
};

pub const SetCursorModePayload = extern struct {
    mode: u8,
};

pub const SetTitleFixedPayload = extern struct {
    title_len: u16,
    // Followed by title_len bytes of UTF-8 data
};

// ============ Cmd Flags ============

pub const DrawRectFlags = packed struct(u16) {
    wide_char: bool = false,
    _reserved: u15 = 0,
};

pub const DrawCharFlags = packed struct(u16) {
    wide_char: bool = false,
    _reserved: u15 = 0,
};

pub const DrawTextFlags = packed struct(u16) {
    _reserved: u16 = 0,
};

// ============ Tests ============

test "BUFFER_HEADER_SIZE and CMD_HEADER_SIZE" {
    try std.testing.expectEqual(@as(usize, 8), BUFFER_HEADER_SIZE);
    try std.testing.expectEqual(@as(usize, 8), CMD_HEADER_SIZE);
}

test "BUFFER_MAGIC is TB little-endian" {
    try std.testing.expectEqual(@as(u16, 0x5442), BUFFER_MAGIC);
}

test "BUFFER_VERSION" {
    try std.testing.expectEqual(@as(u8, 1), BUFFER_VERSION);
}

test "CmdHeader size is 8 bytes" {
    try std.testing.expectEqual(@as(usize, 8), @sizeOf(CmdHeader));
}

test "DrawCmd enum values match TS types.ts" {
    try std.testing.expectEqual(@as(u16, 0x0001), @intFromEnum(DrawCmd.SetBackground));
    try std.testing.expectEqual(@as(u16, 0x0002), @intFromEnum(DrawCmd.SetCursor));
    try std.testing.expectEqual(@as(u16, 0x0003), @intFromEnum(DrawCmd.PushClip));
    try std.testing.expectEqual(@as(u16, 0x0004), @intFromEnum(DrawCmd.PopClip));
    try std.testing.expectEqual(@as(u16, 0x0005), @intFromEnum(DrawCmd.SetEntityId));
    try std.testing.expectEqual(@as(u16, 0x0010), @intFromEnum(DrawCmd.DrawRect));
    try std.testing.expectEqual(@as(u16, 0x0011), @intFromEnum(DrawCmd.DrawText));
    try std.testing.expectEqual(@as(u16, 0x0012), @intFromEnum(DrawCmd.DrawBorder));
    try std.testing.expectEqual(@as(u16, 0x0013), @intFromEnum(DrawCmd.DrawShadow));
    try std.testing.expectEqual(@as(u16, 0x0014), @intFromEnum(DrawCmd.DrawFill));
    try std.testing.expectEqual(@as(u16, 0x0015), @intFromEnum(DrawCmd.DrawChar));
    try std.testing.expectEqual(@as(u16, 0x0016), @intFromEnum(DrawCmd.DrawLine));
    try std.testing.expectEqual(@as(u16, 0x0020), @intFromEnum(DrawCmd.SetTitle));
    try std.testing.expectEqual(@as(u16, 0x0021), @intFromEnum(DrawCmd.ShowCursor));
    try std.testing.expectEqual(@as(u16, 0x0022), @intFromEnum(DrawCmd.HideCursor));
    try std.testing.expectEqual(@as(u16, 0x0023), @intFromEnum(DrawCmd.SetCursorMode));
    try std.testing.expectEqual(@as(u16, 0x0030), @intFromEnum(DrawCmd.BeginSync));
    try std.testing.expectEqual(@as(u16, 0x0031), @intFromEnum(DrawCmd.EndSync));
}

test "SetBackgroundPayload size" {
    try std.testing.expectEqual(@as(usize, 4), @sizeOf(SetBackgroundPayload));
}

test "SetCursorPayload size" {
    try std.testing.expectEqual(@as(usize, 4), @sizeOf(SetCursorPayload));
}

test "PushClipPayload size" {
    try std.testing.expectEqual(@as(usize, 8), @sizeOf(PushClipPayload));
}

test "SetEntityIdPayload size" {
    try std.testing.expectEqual(@as(usize, 8), @sizeOf(SetEntityIdPayload));
}

test "DrawRectPayload size" {
    // u16*4 + u32 + u16 + u16 = 8 + 4 + 2 + 2 = 16
    try std.testing.expectEqual(@as(usize, 16), @sizeOf(DrawRectPayload));
}

test "DrawTextFixedPayload size" {
    // u16*2 + u32*2 + u16*2 = 4 + 8 + 4 = 16
    try std.testing.expectEqual(@as(usize, 16), @sizeOf(DrawTextFixedPayload));
}

test "DrawBorderPayload size" {
    // u16*4 + u32 + u8 + u8 + u16 = 8 + 4 + 1 + 1 + 2 = 16
    try std.testing.expectEqual(@as(usize, 16), @sizeOf(DrawBorderPayload));
}

test "DrawShadowPayload size" {
    // u16*6 + u32 = 12 + 4 = 16
    try std.testing.expectEqual(@as(usize, 16), @sizeOf(DrawShadowPayload));
}

test "DrawCharPayload size" {
    // u16*2 + u32*2 + u16*2 = 4 + 8 + 4 = 16
    try std.testing.expectEqual(@as(usize, 16), @sizeOf(DrawCharPayload));
}

test "DrawLinePayload size" {
    // u16*2 + u16*2 + u32 + u8 + 3 = 4 + 4 + 4 + 4 = 16
    try std.testing.expectEqual(@as(usize, 16), @sizeOf(DrawLinePayload));
}

test "SetCursorModePayload size" {
    try std.testing.expectEqual(@as(usize, 1), @sizeOf(SetCursorModePayload));
}

test "DrawRectFlags default" {
    const flags = DrawRectFlags{};
    try std.testing.expectEqual(false, flags.wide_char);
}

test "DrawRectFlags wide_char set" {
    var flags = DrawRectFlags{};
    flags.wide_char = true;
    try std.testing.expectEqual(true, flags.wide_char);
}
