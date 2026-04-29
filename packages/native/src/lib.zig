const std = @import("std");
const logger = @import("./core/logger.zig");
const glo_alloc = @import("./core/glo_alloc.zig");
const tui_app = @import("./core/tui_app.zig");
const draw_list = @import("./draw_list/draw_list.zig");
const tui_context = @import("./core/tui_context.zig");
const event_bus = @import("./core/event_bus.zig");
const std_io = @import("./core/std_io.zig");
const ansi = @import("./ansi_util.zig");
const err = @import("./core/error.zig");
const Io = std.Io;
const Bool = @import("./core/typedef.zig").Bool;

// ======================== app ========================
pub export fn setupLogger(
    cdir_path: [*:0]const u8,
    clog_name: [*:0]const u8,
    log_level: logger.LOG_LEVEL,
    clear_log: Bool,
) void {
    const alloc = glo_alloc.allocator();
    const dir_path = alloc.dupe(u8, std.mem.span(cdir_path)) catch {
        err.outOfMemory();
    };
    const log_name = alloc.dupe(u8, std.mem.span(clog_name)) catch {
        err.outOfMemory();
    };
    return logger.load(dir_path, log_name, log_level, clear_log);
}

pub export fn startApp() void {
    return tui_app.startApp();
}

pub export fn stopApp() void {
    tui_app.stopApp();
}

pub export fn detectTermSize(ctx: *tui_context.TuiContext) void {
    tui_context.detectTermSize(ctx);
}

pub export fn renderDrawList(
    ctx: *tui_context.TuiContext,
    buf_ptr: [*]const u8,
    buf_len: usize,
) void {
    draw_list.renderDrawList(ctx, buf_ptr, buf_len);
}

// ======================== event ========================
pub export fn event_bus_setup() void {
    event_bus.event_bus_setup();
}

// 发布事件：event_type, data指针, 长度
pub export fn event_bus_emit(event_type: u16, data_ptr: [*]const u8, len: usize) c_int {
    return event_bus.event_bus_emit(event_type, data_ptr, len);
}

pub export fn event_bus_poll() ?*const event_bus.EventSlot {
    return event_bus.event_bus_poll();
}

// 确认读取
pub export fn event_bus_commit() void {
    event_bus.event_bus_commit();
}

// 获取队列统计
pub export fn event_bus_stats(out_pending: *u64) void {
    event_bus.event_bus_stats(out_pending);
}

// ======================== ansi ========================
pub export fn resetStyle() void {
    std_io.init();
    const writer: *Io.Writer = &std_io.writer.interface;
    ansi.format.resetStyleAndFlush(writer) catch unreachable;
}

pub export fn showCursor() void {
    std_io.init();
    const writer: *Io.Writer = &std_io.writer.interface;
    ansi.cursor.showCursorAndFlush(writer) catch unreachable;
}

pub export fn hideCursor() void {
    std_io.init();
    const writer: *Io.Writer = &std_io.writer.interface;
    ansi.cursor.hideCursorAndFlush(writer) catch unreachable;
}

pub export fn clearScreen() void {
    std_io.init();
    const writer: *Io.Writer = &std_io.writer.interface;
    ansi.clear.clearScreenAndFlush(writer) catch unreachable;
}

pub export fn drawText(x: u16, y: u16, cstr: [*:0]const u8) void {
    const s = std.mem.span(cstr);
    std_io.init();
    const writer: *Io.Writer = &std_io.writer.interface;
    ansi.printAndFlush(writer, "\x1b[{d};{d}H{s}", .{ y + 1, x + 1, s }) catch unreachable;
}
