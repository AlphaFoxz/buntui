const std = @import("std");
const Io = std.Io;
const tui_context = @import("./tui_context.zig");
const ansi = @import("../ansi_util.zig");
const std_io = @import("./std_io.zig");
const glo_alloc = @import("./glo_alloc.zig");
const input = @import("../input.zig");
const logger = @import("./logger.zig");
const event_bus = @import("./event_bus.zig");
const Rgba = @import("../ansi_util/style.zig").Rgba;
const err = @import("./error.zig");
const wdt_common = @import("./widgets/common.zig");

pub const TuiScene = extern struct {
    id: u64,
    background_color: Rgba,
    visible: u8,
};

pub fn startApp() void {
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
    logger.logWarning("TuiApp destroyed");
}
