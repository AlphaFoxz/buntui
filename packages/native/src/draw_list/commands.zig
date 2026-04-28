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
