const std = @import("std");
const draw_list = @import("./draw_list/draw_list.zig");
const tui_context = @import("./core/tui_context.zig");
const std_io = @import("./core/std_io.zig");
const frame = @import("./render/frame.zig");

const alloc = std.heap.c_allocator;

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

pub export fn allocWasmBuffer(size: usize) [*]u8 {
    const buf = alloc.alloc(u8, size) catch @panic("allocWasmBuffer: OOM");
    return buf.ptr;
}

pub export fn deallocWasmBuffer(ptr: [*]u8, size: usize) void {
    alloc.free(ptr[0..size]);
}

pub export fn createTuiContext() *tui_context.TuiContext {
    const buf = alloc.create(tui_context.TuiContext) catch @panic("createTuiContext: OOM");
    buf.* = .{
        .tick = 0,
        .x = 0,
        .y = 0,
        .rows = 35,
        .cols = 90,
        .resize_behavior = .Auto,
        .debug_mode = .False,
    };
    return buf;
}

pub export fn updateTuiContext(
    ctx: *tui_context.TuiContext,
    tick: u64,
    x: i16,
    y: i16,
    rows: i16,
    cols: i16,
    resize_behavior: u8,
    debug_mode: u8,
) void {
    ctx.tick = tick;
    ctx.x = x;
    ctx.y = y;
    ctx.rows = rows;
    ctx.cols = cols;
    ctx.resize_behavior = @enumFromInt(resize_behavior);
    ctx.debug_mode = @enumFromInt(debug_mode);
}

pub export fn destroyTuiContext(ctx: *tui_context.TuiContext) void {
    alloc.destroy(ctx);
}
