const std = @import("std");
const logger = @import("../core/logger.zig");
const tui_context = @import("../core/tui_context.zig");
const frame = @import("../render/frame.zig");
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

pub const RasterizerState = rasterizer.RasterizerState;

pub const PostState = struct {
    cursor_x: u16 = 0,
    cursor_y: u16 = 0,
    show_cursor: bool = false,
    hide_cursor: bool = false,
    cursor_mode: ?u8 = null,
    title: ?[]const u8 = null,
};

pub const ParseResult = struct {
    resized: bool,
    synchronized_update: bool,
    post: PostState,
};

var raster_state: RasterizerState = undefined;
var raster_initialized: bool = false;

fn prescanBackground(buf: []const u8, buf_len: usize) void {
    var pre_offset: usize = BUFFER_HEADER_SIZE;
    while (pre_offset + CMD_HEADER_SIZE <= buf_len) {
        const pre_cmd_type = readU16(buf, pre_offset);
        const pre_payload_len = readU32(buf, pre_offset + 4);
        if (pre_offset + CMD_HEADER_SIZE + pre_payload_len > buf_len) break;
        const pre_enum = cmd.drawCmdFromInt(pre_cmd_type) orelse {
            pre_offset += CMD_HEADER_SIZE + pre_payload_len;
            continue;
        };
        if (pre_enum == .SetBackground) {
            const pre_payload = buf[pre_offset + CMD_HEADER_SIZE .. pre_offset + CMD_HEADER_SIZE + pre_payload_len];
            if (pre_payload.len >= 4) {
                raster_state.default_bg = Rgba.fromU32(readU32(pre_payload, 0));
            }
            return;
        }
        pre_offset += CMD_HEADER_SIZE + pre_payload_len;
    }
}

fn clearFrame() void {
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
}

fn parseCommands(buf: []const u8, buf_len: usize) PostState {
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

        const cmd_enum = cmd.drawCmdFromInt(cmd_type) orelse {
            offset += CMD_HEADER_SIZE + payload_len;
            continue;
        };
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

    return post;
}

pub fn parseDrawList(ctx: *tui_context.TuiContext, buf_ptr: [*]const u8, buf_len: usize) ?ParseResult {
    if (buf_len < BUFFER_HEADER_SIZE) {
        logger.logError("DrawList: buffer too small for header");
        return null;
    }
    const buf = buf_ptr[0..buf_len];

    const magic = readU16(buf, 0);
    if (magic != BUFFER_MAGIC) {
        logger.logErrorFmt("DrawList: invalid magic 0x{X}, expected 0x{X}", .{ magic, BUFFER_MAGIC });
        return null;
    }
    const version = buf[2];
    if (version != BUFFER_VERSION) {
        logger.logErrorFmt("DrawList: unsupported version {}, expected {}", .{ version, BUFFER_VERSION });
        return null;
    }
    const synchronized_update = (buf[3] & 0x01) != 0;

    if (!raster_initialized) {
        raster_state = RasterizerState.init(ctx.cols, ctx.rows);
        raster_initialized = true;
    }
    raster_state.reset(ctx.cols, ctx.rows);

    const resized = frame.checkScreenSize(ctx);

    prescanBackground(buf, buf_len);
    clearFrame();

    const post = parseCommands(buf, buf_len);

    return .{
        .resized = resized,
        .synchronized_update = synchronized_update,
        .post = post,
    };
}
