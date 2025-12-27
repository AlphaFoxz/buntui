const std = @import("std");
const glo_alloc = @import("../core/glo_alloc.zig");
const err = @import("../core/error.zig");
const TuiContext = @import("../core/tui_context.zig").TuiContext;
const TuiScene = @import("../core/tui_app.zig").TuiScene;
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
    _padding: [3]u8 = undefined,
};

var prev_frame: []TuiCell = &.{};
var next_frame: []TuiCell = &.{};
var frame_width: usize = 0;
var frame_height: usize = 0;

inline fn getCell(frame: []TuiCell, x: usize, y: usize) *TuiCell {
    return &frame[y * frame_width + x];
}

fn resizeFrame(frame: *[]TuiCell, rows: usize, cols: usize) void {
    const allocator = glo_alloc.allocator();
    if (frame.len > 0) allocator.free(frame.*);

    frame.* = allocator.alloc(TuiCell, rows * cols) catch {
        err.outOfMemory();
    };
}

pub fn rasterization(ctx: *TuiContext, _: *TuiScene) void {
    const size = ctx.x * ctx.y;

    if (ctx.x != frame_width and prev_frame.len != size) {
        resizeFrame(&prev_frame, ctx.y, ctx.x);
        resizeFrame(&next_frame, ctx.y, ctx.x);
        frame_width = ctx.x;
        frame_height = ctx.y;
    }
}

pub fn dirtyTrack(allocator: std.mem.Allocator) !std.ArrayList(struct { x: usize, y: usize }) {
    var changes = std.ArrayList(struct { x: usize, y: usize }).init(allocator);

    if (prev_frame.len == 0) return changes;

    for (0..frame_height) |y| {
        for (0..frame_width) |x| {
            const prev = getCell(prev_frame, x, y);
            const next = getCell(next_frame, x, y);
            if (!std.meta.eql(prev.*, next.*)) {
                try changes.append(.{ .x = x, .y = y });
            }
        }
    }

    return changes;
}

pub fn swap() void {
    std.mem.swap([]TuiCell, &prev_frame, &next_frame);
}

pub fn deinit() void {
    const allocator = glo_alloc.allocator();
    if (prev_frame.len > 0) allocator.free(prev_frame);
    if (next_frame.len > 0) allocator.free(next_frame);
    prev_frame = &.{};
    next_frame = &.{};
    frame_width = 0;
    frame_height = 0;
}
