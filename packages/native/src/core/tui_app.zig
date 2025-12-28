const std = @import("std");
const Io = std.Io;
const ansi = @import("../ansi_util.zig");
const std_io = @import("./std_io.zig");
const glo_alloc = @import("./glo_alloc.zig");
const input = @import("../input.zig");
const err = @import("./error.zig");
const logger = @import("./logger.zig");
const event_bus = @import("./event_bus.zig");
const Rgba = @import("../ansi_util/style.zig").Rgba;
const frame = @import("../render/frame.zig");
const Bool = @import("./typedef.zig").Bool;
const TuiWidgetEntity = @import("./widgets/entity.zig").TuiWidgetEntity;

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
fn compareTuiWidgetEntity(a: *TuiWidgetEntity, b: *TuiWidgetEntity) bool {
    return a.z_index > b.z_index;
}
// XXX impl binary search
inline fn quickSearch(container: []*TuiWidgetEntity, target: *TuiWidgetEntity) ?usize {
    for (0..container.len) |w| {
        if (container[w] == target) {
            return w;
        }
    }
    return null;
}
pub const TuiScene = extern struct {
    bg_rgba: Rgba,
    widgets: *std.ArrayList(*TuiWidgetEntity),
    sorted: Bool = .True,

    pub fn mountWidget(self: *TuiScene, widget: *TuiWidgetEntity) void {
        self.widgets.append(glo_alloc.allocator(), widget) catch {
            err.outOfMemory();
        };
        self.sorted = .False;
    }

    pub fn unmountWidget(self: *TuiScene, widget: *TuiWidgetEntity) void {
        const index = quickSearch(self.widgets.items, widget);
        if (index != null) {
            _ = self.widgets.orderedRemove(index.?);
        }
    }

    pub fn sort(self: *TuiScene) void {
        std.mem.sort(TuiWidgetEntity, self.widgets.items, .{}, compareTuiWidgetEntity);
        self.sorted = .True;
    }
};

pub fn createScene(bg_rgba: Rgba) *TuiScene {
    var alloc = glo_alloc.allocator();
    const scene = alloc.create(TuiScene) catch {
        err.outOfMemory();
    };
    const widgets = alloc.create(std.ArrayList(*TuiWidgetEntity)) catch {
        err.outOfMemory();
    };
    widgets.* = std.ArrayList(*TuiWidgetEntity).initCapacity(alloc, 0) catch {
        err.outOfMemory();
    };
    scene.* = TuiScene{
        .bg_rgba = bg_rgba,
        .widgets = widgets,
    };
    return scene;
}

pub fn destroyScene(scene: *TuiScene) void {
    var alloc = glo_alloc.allocator();
    scene.widgets.deinit(alloc);
    defer alloc.destroy(scene);
}
