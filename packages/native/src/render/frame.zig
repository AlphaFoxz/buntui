const std = @import("std");
const glo_alloc = @import("../core/glo_alloc.zig");
const err = @import("../core/error.zig");
const TuiContext = @import("../core/tui_context.zig").TuiContext;
const TuiScale = @import("../core/typedef.zig").TuiScale;
const Rgba = @import("../ansi_util/style.zig").Rgba;

pub const CellType = enum(u8) {
    Ascii = 0,
    Wide = 1,
    Hidden = 2,
};

pub const TuiCell = struct {
    entity_id: u64,
    fg_rgba: Rgba,
    bg_rgba: Rgba,
    char: u16,
    font_style: u16,
    cell_type: CellType,

    pub fn eql(self: TuiCell, other: TuiCell) bool {
        return self.entity_id == other.entity_id and
            self.fg_rgba.eql(other.fg_rgba) and
            self.bg_rgba.eql(other.bg_rgba) and
            self.char == other.char and
            self.font_style == other.font_style and
            self.cell_type == other.cell_type;
    }
};

pub const TuiFrame = struct {
    width: TuiScale,
    height: TuiScale,
    cells: []TuiCell = undefined,
};

pub var prev_frame: TuiFrame = .{ .width = 0, .height = 0 };
pub var next_frame: TuiFrame = .{ .width = 0, .height = 0 };
pub var dirty: std.DynamicBitSet = undefined;

fn resizeFrame(f: *TuiFrame, rows: TuiScale, cols: TuiScale) void {
    const allocator = glo_alloc.allocator();
    if (f.width > 0) {
        allocator.free(f.cells);
    }

    const size = rows * cols;
    // Allocate without initializing — renderDrawList fills next_frame
    // immediately after checkScreenSize, and dirtyTrack naturally marks
    // everything dirty on the first frame after a resize.
    f.cells = allocator.alloc(TuiCell, size) catch {
        err.outOfMemory();
    };
    f.width = cols;
    f.height = rows;
    if (dirty.capacity() != size) {
        dirty.resize(size, false) catch {
            err.outOfMemory();
        };
    }
}

pub fn checkScreenSize(ctx: *TuiContext) bool {
    const size = ctx.rows * ctx.cols;
    var resized = false;

    if (ctx.cols != prev_frame.width or prev_frame.cells.len != size) {
        resizeFrame(&prev_frame, ctx.rows, ctx.cols);
        resized = true;
    }
    if (ctx.cols != next_frame.width or next_frame.cells.len != size) {
        resizeFrame(&next_frame, ctx.rows, ctx.cols);
        resized = true;
    }
    return resized;
}

pub fn dirtyTrack() void {
    dirty.setRangeValue(.{ .start = 0, .end = dirty.capacity() }, false);

    for (next_frame.cells, 0..) |cell, index| {
        if (!cell.eql(prev_frame.cells[index])) {
            dirty.set(index);
        }
    }
}

pub fn swap() void {
    std.mem.swap([]TuiCell, &prev_frame.cells, &next_frame.cells);
}

pub fn init() void {
    const allocator = glo_alloc.allocator();
    dirty = std.DynamicBitSet.initEmpty(allocator, 1) catch {
        err.outOfMemory();
    };
}

pub fn deinit() void {
    const allocator = glo_alloc.allocator();
    dirty.deinit();
    if (prev_frame.width > 0) {
        allocator.free(prev_frame.cells);
    }
    if (next_frame.width > 0) {
        allocator.free(next_frame.cells);
    }
}
