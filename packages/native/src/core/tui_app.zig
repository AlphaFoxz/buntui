const std = @import("std");
const Io = std.Io;
const ansi = @import("../ansi_util.zig");
const std_io = @import("./std_io.zig");
const glo_alloc = @import("./glo_alloc.zig");
const input = @import("../input.zig");
const err = @import("./error.zig");
const logger = @import("./logger.zig");
const event_bus = @import("./event_bus.zig");
const frame = @import("../render/frame.zig");
const Rgba = @import("../ansi_util/style.zig").Rgba;
const Bool = @import("./typedef.zig").Bool;

// ======================== app ========================
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

// ======================== scene ========================
pub const TuiScene = extern struct {
    bg_rgba: Rgba,
    sorted: Bool = .True,
};

pub fn createScene(bg_rgba: Rgba) *TuiScene {
    var alloc = glo_alloc.allocator();
    const scene = alloc.create(TuiScene) catch {
        err.outOfMemory();
    };
    scene.* = TuiScene{
        .bg_rgba = bg_rgba,
    };
    return scene;
}

pub fn destroyScene(scene: *TuiScene) void {
    var alloc = glo_alloc.allocator();
    alloc.destroy(scene);
}
