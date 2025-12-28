const TuiScale = @import("../typedef.zig").TuiScale;

pub const RectComponent = extern struct {
    x: TuiScale,
    y: TuiScale,
    width: TuiScale,
    height: TuiScale,
};

pub const ColorComponent = extern struct {
    fg_rgba: u32,
    bg_rgba: u32,
};

pub const StyleModifier = enum(u16) {};

pub const StyleBorder = enum(u8) {
    None = 0,
    Solid = 1,
    Double = 2,
    Rounded = 3,
    bold = 4,
    Dashed = 5,
    Dotted = 6,
    OutsetBold = 7,
    OutsetDouble = 8,
};

pub const StyleComponent = extern struct {
    z_index: i16,
    modifier: StyleModifier,
};

pub const BorderComponent = extern struct {
    style: StyleBorder,
};

pub const ShadowComponent = extern struct {
    offset_x: TuiScale,
    offset_y: TuiScale,
    color: u32,
    covered: u8,
};
