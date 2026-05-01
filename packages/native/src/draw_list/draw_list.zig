const std = @import("std");
const Io = std.Io;
const logger = @import("../core/logger.zig");
const std_io = @import("../core/std_io.zig");
const tui_context = @import("../core/tui_context.zig");
const frame = @import("../render/frame.zig");
const ansi = @import("../ansi_util.zig");
const cmd = @import("./commands.zig");
const rasterizer = @import("./rasterizer.zig");
const binary = @import("./binary.zig");

const BUFFER_HEADER_SIZE = cmd.BUFFER_HEADER_SIZE;
const BUFFER_MAGIC = cmd.BUFFER_MAGIC;
const BUFFER_VERSION = cmd.BUFFER_VERSION;
const CMD_HEADER_SIZE = cmd.CMD_HEADER_SIZE;
const DrawCmd = cmd.DrawCmd;
const readU16 = binary.readU16;
const readU32 = binary.readU32;
const Rgba = @import("../ansi_util/style.zig").Rgba;
const Color = @import("../ansi_util/style.zig").Color;
const CellStyle = @import("../ansi_util/style.zig").CellStyle;
const FontStyle = @import("../ansi_util/style.zig").FontStyle;

pub const RasterizerState = rasterizer.RasterizerState;

var raster_state: RasterizerState = undefined;
var raster_initialized: bool = false;

// Post-command state for terminal control
const PostState = struct {
    cursor_x: u16 = 0,
    cursor_y: u16 = 0,
    show_cursor: bool = false,
    hide_cursor: bool = false,
    cursor_mode: ?u8 = null,
    title: ?[]const u8 = null,
};

pub fn renderDrawList(ctx: *tui_context.TuiContext, buf_ptr: [*]const u8, buf_len: usize) void {
    if (buf_len < BUFFER_HEADER_SIZE) {
        logger.logError("DrawList: buffer too small for header");
        return;
    }
    const buf = buf_ptr[0..buf_len];

    // Parse buffer header
    const magic = readU16(buf, 0);
    if (magic != BUFFER_MAGIC) {
        logger.logErrorFmt("DrawList: invalid magic 0x{X}, expected 0x{X}", .{ magic, BUFFER_MAGIC });
        return;
    }
    const version = buf[2];
    if (version != BUFFER_VERSION) {
        logger.logErrorFmt("DrawList: unsupported version {}, expected {}", .{ version, BUFFER_VERSION });
        return;
    }
    const header_flags = buf[3];
    const synchronized_update = (header_flags & 0x01) != 0;

    // Initialize rasterizer state
    if (!raster_initialized) {
        raster_state = RasterizerState.init(ctx.cols, ctx.rows);
        raster_initialized = true;
    }
    raster_state.reset(ctx.cols, ctx.rows);

    // Ensure frame buffers; force full redraw on resize so prev_frame
    // (which no longer represents the terminal state) doesn't cause ghost cells.
    const resized = frame.checkScreenSize(ctx);

    // Pre-scan: extract SetBackground before clearing cells so the initial fill
    // uses the scene's actual bg color instead of the reset default (black).
    {
        var pre_offset: usize = BUFFER_HEADER_SIZE;
        while (pre_offset + CMD_HEADER_SIZE <= buf_len) {
            const pre_cmd_type = readU16(buf, pre_offset);
            const pre_payload_len = readU32(buf, pre_offset + 4);
            if (pre_offset + CMD_HEADER_SIZE + pre_payload_len > buf_len) break;
            if (@as(DrawCmd, @enumFromInt(pre_cmd_type)) == .SetBackground) {
                const pre_payload = buf[pre_offset + CMD_HEADER_SIZE .. pre_offset + CMD_HEADER_SIZE + pre_payload_len];
                if (pre_payload.len >= 4) {
                    raster_state.default_bg = Rgba.fromU32(readU32(pre_payload, 0));
                }
                break;
            }
            pre_offset += CMD_HEADER_SIZE + pre_payload_len;
        }
    }

    // Clear next_frame with default background (now has the correct scene color)
    for (frame.next_frame.cells) |*cell| {
        cell.* = .{
            .entity_id = 0,
            .fg_rgba = .{ .r = 0xFF, .g = 0xFF, .b = 0xFF, .a = 0xFF },
            .bg_rgba = raster_state.default_bg,
            .char = ' ',
            .font_style = 0,
            .cell_type = .Ascii,
        };
    }

    // Parse and rasterize commands
    var post = PostState{};
    var offset: usize = BUFFER_HEADER_SIZE;

    while (offset + CMD_HEADER_SIZE <= buf_len) {
        const cmd_type = readU16(buf, offset);
        const flags = readU16(buf, offset + 2);
        const payload_len = readU32(buf, offset + 4);

        if (offset + CMD_HEADER_SIZE + payload_len > buf_len) {
            logger.logWarningFmt("DrawList: command at offset {} exceeds buffer (cmd=0x{X}, len={})", .{ offset, cmd_type, payload_len });
            break;
        }

        const payload_start = offset + CMD_HEADER_SIZE;
        const payload = if (payload_len > 0) buf[payload_start .. payload_start + payload_len] else buf[payload_start..payload_start];

        // Intercept terminal control commands for post-processing
        const cmd_enum: DrawCmd = @enumFromInt(cmd_type);
        switch (cmd_enum) {
            .SetCursor => {
                if (payload.len >= 4) {
                    post.cursor_x = readU16(payload, 0);
                    post.cursor_y = readU16(payload, 2);
                }
            },
            .ShowCursor => {
                post.show_cursor = true;
                post.hide_cursor = false;
            },
            .HideCursor => {
                post.hide_cursor = true;
                post.show_cursor = false;
            },
            .SetCursorMode => {
                if (payload.len >= 1) {
                    post.cursor_mode = payload[0];
                }
            },
            .SetTitle => {
                if (payload.len >= 2) {
                    const title_len = readU16(payload, 0);
                    if (payload.len >= 2 + title_len) {
                        post.title = payload[2 .. 2 + title_len];
                    }
                }
            },
            else => {
                rasterizer.processCommand(&raster_state, frame.next_frame.cells, cmd_type, flags, payload);
            },
        }

        offset += CMD_HEADER_SIZE + payload_len;
    }

    // Diff and emit ANSI — after resize, force all cells dirty to avoid ghost content
    if (resized) {
        frame.dirty.setRangeValue(.{ .start = 0, .end = frame.dirty.capacity() }, true);
    } else {
        frame.dirtyTrack();
    }

    const writer: *Io.Writer = &std_io.writer.interface;
    const dirty = frame.dirty;
    const width = frame.next_frame.width;
    const height = frame.next_frame.height;
    const cells = frame.next_frame.cells;

    if (synchronized_update) {
        writer.writeAll("\x1B[?2026h") catch {};
    }

    // Emit dirty cells: set style first, then move cursor and write char
    var last_style: ?CellStyle = null;
    for (0..height) |y| {
        for (0..width) |x| {
            const index = y * width + x;
            const cell = cells[index];
            if (cell.cell_type != .Hidden and dirty.isSet(index)) {
                // Apply style before writing
                const cell_style: CellStyle = .{
                    .foreground = .{ .Rgba = cell.fg_rgba },
                    .background = .{ .Rgba = cell.bg_rgba },
                    .font_style = FontStyle.fromU11(@intCast(cell.font_style)),
                };
                ansi.format.updateStyle(writer, cell_style, last_style) catch {};
                last_style = cell_style;

                // Move cursor and write character
                ansi.writeCharToPos(writer, x, y, cell.char) catch {};
            }
        }
    }

    // Post-command: cursor control
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

    // Post-command: title
    if (post.title) |title| {
        writer.print("\x1B]0;{s}\x07", .{title}) catch {};
    }

    if (synchronized_update) {
        writer.writeAll("\x1B[?2026l") catch {};
    }

    writer.flush() catch {};
    frame.swap();
    ctx.tick += 1;
}

