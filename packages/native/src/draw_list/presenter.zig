const std = @import("std");
const Io = std.Io;
const std_io = @import("../core/std_io.zig");
const tui_context = @import("../core/tui_context.zig");
const frame = @import("../render/frame.zig");
const ansi = @import("../ansi_util.zig");
const parser = @import("./parser.zig");

const CellStyle = @import("../ansi_util/style.zig").CellStyle;
const FontStyle = @import("../ansi_util/style.zig").FontStyle;

const PostState = parser.PostState;
const ParseResult = parser.ParseResult;

pub fn presentFrame(ctx: *tui_context.TuiContext, result: ParseResult) void {
    if (result.resized) {
        frame.dirty.setRangeValue(.{ .start = 0, .end = frame.dirty.capacity() }, true);
    } else {
        frame.dirtyTrack();
    }

    const writer: *Io.Writer = &std_io.writer.interface;
    const dirty = frame.dirty;
    const width = frame.next_frame.width;
    const height = frame.next_frame.height;
    const cells = frame.next_frame.cells;

    if (result.synchronized_update) {
        writer.writeAll("\x1B[?2026h") catch {};
    }

    var last_style: ?CellStyle = null;
    for (0..height) |y| {
        for (0..width) |x| {
            const index = y * width + x;
            const cell = cells[index];
            if (cell.cell_type != .Hidden and dirty.isSet(index)) {
                const cell_style: CellStyle = .{
                    .foreground = .{ .Rgba = cell.fg_rgba },
                    .background = .{ .Rgba = cell.bg_rgba },
                    .font_style = FontStyle.fromU11(@intCast(cell.font_style)),
                };
                ansi.format.updateStyle(writer, cell_style, last_style) catch {};
                last_style = cell_style;

                ansi.writeCharToPos(writer, x, y, cell.char) catch {};
            }
        }
    }

    emitPostCommands(writer, result.post);

    if (result.synchronized_update) {
        writer.writeAll("\x1B[?2026l") catch {};
    }

    writer.flush() catch {};
    frame.swap();
    ctx.tick += 1;
}

fn emitPostCommands(writer: *Io.Writer, post: PostState) void {
    if (post.hide_cursor) {
        ansi.cursor.hideCursor(writer) catch {};
    } else if (post.show_cursor) {
        ansi.cursor.setCursor(writer, post.cursor_x, post.cursor_y) catch {};
        ansi.cursor.showCursor(writer) catch {};
    }
    if (post.cursor_mode) |mode_raw| {
        const mode: ansi.cursor.CursorMode = @enumFromInt(mode_raw);
        ansi.cursor.setCursorMode(writer, mode) catch {};
    }
    if (post.title) |title| {
        writer.print("\x1B]0;{s}\x07", .{title}) catch {};
    }
}
