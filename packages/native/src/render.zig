const std = @import("std");
const Io = std.Io;
const std_io = @import("./core/std_io.zig");
const ansi = @import("./ansi_util.zig");
const frame = @import("./render/frame.zig");
const TuiScene = @import("./core/tui_app.zig").TuiScene;
const TuiContext = @import("./core/tui_context.zig").TuiContext;

var count_buf: [10]u8 = undefined;
pub fn renderFrame(ctx: *TuiContext, scene: *TuiScene) void {
    frame.rasterization(ctx, scene);
    const writer: *Io.Writer = &std_io.writer.interface;

    const widgets = scene.widgets.*.items;
    ansi.writeAllToPos(
        writer,
        1,
        1,
        std.fmt.bufPrint(&count_buf, "{}", .{widgets.len}) catch unreachable,
    ) catch unreachable;
    writer.flush() catch unreachable;
}
