const std = @import("std");
const Io = std.Io;
const std_io = @import("./core/std_io.zig");
const ansi = @import("./ansi_util.zig");
const logger = @import("./core/logger.zig");
const frame = @import("./render/frame.zig");
const TuiScene = @import("./core/tui_app.zig").TuiScene;
const TuiContext = @import("./core/tui_context.zig").TuiContext;

var buf: [64]u8 = undefined;
pub fn renderFrame(ctx: *TuiContext, scene: *TuiScene) void {
    const next_frame = &frame.next_frame;
    const writer: *Io.Writer = &std_io.writer.interface;
    frame.rasterization(ctx, scene);
    frame.dirtyTrack();

    const dirty = frame.dirty;
    const width = next_frame.width;
    const height = next_frame.height;

    const bg_rgba = ansi.style.Rgba{
        .r = 0x7F,
        .g = 0x60,
        .b = 0xFE,
        .a = 0x7F,
    };
    ansi.format.updateStyle(writer, ansi.style.CellStyle{
        .background = ansi.style.Color{
            // .Rgba = scene.bg_color,
            .Rgba = bg_rgba,
        },
        .foreground = .{ .Rgba = ansi.style.BuiltinRgbaColor.White },
    }, null) catch {
        logger.logError("Failed to update style");
    };

    for (0..height) |y| {
        for (0..width) |x| {
            const index = y * width + x;
            const cell = next_frame.cells[index];
            if (cell.cell_type != .Hidden and dirty.isSet(index)) {
                ansi.writeCharToPos(writer, x, y, cell.char) catch unreachable;
            }
        }
    }

    // ansi.writeCharToPos(writer, 0, 0, '你') catch unreachable;
    // ansi.writeCharToPos(writer, 2, 0, '好') catch unreachable;
    // ansi.writeAllToPos(
    //     writer,
    //     0,
    //     1,
    //     std.fmt.bufPrint(&buf, "size: {}, {}", .{ ctx.cols, ctx.rows }) catch unreachable,
    // ) catch unreachable;
    // ansi.writeAllToPos(
    //     writer,
    //     0,
    //     2,
    //     std.fmt.bufPrint(&buf, "nextf: {}, {}", .{ next_frame.width, next_frame.height }) catch unreachable,
    // ) catch unreachable;
    // ansi.writeAllToPos(
    //     writer,
    //     0,
    //     3,
    //     std.fmt.bufPrint(&buf, "cells: {}", .{next_frame.cells.len}) catch unreachable,
    // ) catch unreachable;

    // ansi.writeAllToPos(
    //     writer,
    //     0,
    //     3,
    //     std.fmt.bufPrint(&buf, "cells: {}, {}", .{
    //         next_frame.cells[0].bg_rgba.toU32(),
    //         frame.prev_frame.cells[0].bg_rgba.toU32(),
    //     }) catch unreachable,
    // ) catch unreachable;
    // ansi.writeAllToPos(
    //     writer,
    //     0,
    //     4,
    //     std.fmt.bufPrint(&buf, "scene: {}, {}, {}, {}", .{
    //         scene.bg_rgba.r,
    //         scene.bg_rgba.g,
    //         scene.bg_rgba.b,
    //         scene.bg_rgba.a,
    //     }) catch unreachable,
    // ) catch unreachable;

    defer writer.flush() catch unreachable;

    // frame.swap();
    ctx.tick += 1;
}
