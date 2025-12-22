const std = @import("std");
const glo_alloc = @import("../core/glo_alloc.zig");
const err = @import("../core/error.zig");
const TuiScale = @import("../core/typedef.zig").TuiScale;

pub const CellType = enum(u16) {
    Ascii = 0,
    Wide = 1,
    Hidden = 2,
};

pub const TuiCell = extern struct {
    cell_type: CellType,
    char: u16,
    fg: u32,
    bg: u32,
    style: u32,
};
