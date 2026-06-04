const std = @import("std");
const draw_list = @import("./draw_list/draw_list.zig");
const tui_context = @import("./core/tui_context.zig");
const std_io = @import("./core/std_io.zig");
const frame = @import("./render/frame.zig");

pub export fn renderDrawListToBuffer(
    ctx: *tui_context.TuiContext,
    buf_ptr: [*]const u8,
    buf_len: usize,
) void {
    std_io.init();
    frame.init();
    std_io.resetOutput();
    draw_list.renderDrawList(ctx, buf_ptr, buf_len);
}

pub export fn getOutputPtr() [*]const u8 {
    return std_io.getOutputPtr();
}

pub export fn getOutputLen() usize {
    return std_io.getOutputLen();
}

pub export fn setTerminalSize(ctx: *tui_context.TuiContext, rows: u16, cols: u16) void {
    ctx.rows = @intCast(rows);
    ctx.cols = @intCast(cols);
}
