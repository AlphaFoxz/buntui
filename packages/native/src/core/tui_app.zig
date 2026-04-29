const std = @import("std");
const Io = std.Io;
const ansi = @import("../ansi_util.zig");
const std_io = @import("./std_io.zig");
const input = @import("../input.zig");
const logger = @import("./logger.zig");
const event_bus = @import("./event_bus.zig");
const frame = @import("../render/frame.zig");
pub fn startApp() void {
    frame.init();
    std_io.init();
    event_bus.event_bus_setup();
    const writer: *Io.Writer = &std_io.writer.interface;
    ansi.terminal.enterAlternateScreen(writer) catch unreachable;
    ansi.cursor.hideCursorAndFlush(writer) catch unreachable;
    input.startListening();
    logger.logInfo("TuiApp created");
}

pub fn stopApp() void {
    const writer: *Io.Writer = &std_io.writer.interface;
    ansi.cursor.showCursor(writer) catch unreachable;
    ansi.terminal.leaveAlternateScreen(writer) catch unreachable;
    input.stopListening();
    ansi.clear.clearScreenAndFlush(writer) catch unreachable;
    std_io.flushAll();
    frame.deinit();
    logger.logWarning("TuiApp destroyed");
    logger.unload();
}
