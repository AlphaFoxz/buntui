const std = @import("std");
const logger = @import("../core/logger.zig");
const frame = @import("../render/frame.zig");
const Rgba = @import("../ansi_util/style.zig").Rgba;
const FontStyle = @import("../ansi_util/style.zig").FontStyle;
const TuiScale = @import("../core/typedef.zig").TuiScale;
const cmd = @import("./commands.zig");
const ClipStack = @import("./clip_stack.zig").ClipStack;
const ClipRect = @import("./clip_stack.zig").ClipRect;
const binary = @import("./binary.zig");

const DrawCmd = cmd.DrawCmd;
const TuiCell = frame.TuiCell;
const CellType = frame.CellType;

// ============ Rasterizer State ============

pub const RasterizerState = struct {
    clip_stack: ClipStack,
    entity_id: u64,
    default_bg: Rgba,
    frame_width: TuiScale,
    frame_height: TuiScale,

    pub fn init(screen_width: TuiScale, screen_height: TuiScale) RasterizerState {
        return .{
            .clip_stack = ClipStack.init(screen_width, screen_height),
            .entity_id = 0,
            .default_bg = Rgba.fromU32(0x000000FF),
            .frame_width = screen_width,
            .frame_height = screen_height,
        };
    }

    pub fn reset(self: *RasterizerState, screen_width: TuiScale, screen_height: TuiScale) void {
        self.clip_stack.reset(screen_width, screen_height);
        self.entity_id = 0;
        self.default_bg = Rgba.fromU32(0x000000FF);
        self.frame_width = screen_width;
        self.frame_height = screen_height;
    }
};

// ============ Command Dispatch ============

pub fn processCommand(state: *RasterizerState, cells: []TuiCell, command_type: u16, flags: u16, payload: []const u8) void {
    const cmd_type: DrawCmd = @enumFromInt(command_type);
    switch (cmd_type) {
        .SetBackground => rasterizeSetBackground(state, payload),
        .SetCursor => {}, // Handled after all commands in mod.zig
        .PushClip => rasterizePushClip(state, payload),
        .PopClip => state.clip_stack.pop(),
        .SetEntityId => rasterizeSetEntityId(state, payload),
        .DrawRect => rasterizeDrawRect(state, cells, payload, flags),
        .DrawText => rasterizeDrawText(state, cells, payload),
        .DrawBorder => rasterizeDrawBorder(state, cells, payload),
        .DrawShadow => rasterizeDrawShadow(state, cells, payload),
        .DrawFill => rasterizeDrawFill(state, cells, payload),
        .DrawChar => rasterizeDrawChar(state, cells, payload, flags),
        .DrawLine => rasterizeDrawLine(state, cells, payload),
        .SetTitle => {}, // Handled after all commands in mod.zig
        .ShowCursor => {}, // Handled after all commands
        .HideCursor => {}, // Handled after all commands
        .SetCursorMode => {}, // Handled after all commands
        .BeginSync => {}, // Handled at buffer level
        .EndSync => {}, // Handled at buffer level
    }
}

// ============ State Commands ============

fn rasterizeSetBackground(state: *RasterizerState, payload: []const u8) void {
    if (payload.len < 4) return;
    state.default_bg = Rgba.fromU32(readU32(payload, 0));
}

fn rasterizePushClip(state: *RasterizerState, payload: []const u8) void {
    if (payload.len < 8) return;
    const rect: ClipRect = .{
        .x = readU16(payload, 0),
        .y = readU16(payload, 2),
        .width = readU16(payload, 4),
        .height = readU16(payload, 6),
    };
    _ = state.clip_stack.push(rect);
}

fn rasterizeSetEntityId(state: *RasterizerState, payload: []const u8) void {
    if (payload.len < 8) return;
    state.entity_id = readU64(payload, 0);
}

// ============ Clip Helpers ============

/// Compute the intersection of a rectangular region with the current clip,
/// returning a ClipRect suitable for use as loop bounds. Returns an empty
/// rect (width or height == 0) when the region is entirely clipped out.
fn clipIntersect(clip: ClipRect, x: TuiScale, y: TuiScale, w: TuiScale, h: TuiScale) ClipRect {
    return clip.intersect(.{ .x = x, .y = y, .width = w, .height = h });
}

/// Intersect a single-row strip with the clip rect. Used for functions that
/// iterate over a fixed row (e.g. border edges, text rendering).
fn clipRow(clip: ClipRect, row: TuiScale, col_start: TuiScale, col_end: TuiScale) struct { start: TuiScale, end: TuiScale } {
    if (row < clip.y or row >= clip.y + clip.height) return .{ .start = col_start, .end = col_start };
    const cs = @max(col_start, clip.x);
    const ce = @min(col_end, clip.x + clip.width);
    return .{ .start = cs, .end = if (ce > cs) ce else cs };
}

// ============ Wide Char Helper ============

/// Write a wide character cell and its Hidden continuation cell.
/// The continuation cell is only written if next_col is within the clip.
fn writeWidePair(
    cells: []TuiCell,
    state: *RasterizerState,
    col: TuiScale,
    row: TuiScale,
    clip: ClipRect,
    char: u16,
    fg: Rgba,
    bg: Rgba,
    font_style: u16,
) void {
    writeCell(cells, state.frame_width, state.frame_height, col, row, .{
        .entity_id = state.entity_id,
        .fg_rgba = fg,
        .bg_rgba = bg,
        .char = char,
        .font_style = font_style,
        .cell_type = .Wide,
    });
    const next_col = col + 1;
    if (clip.contains(next_col, row)) {
        writeCell(cells, state.frame_width, state.frame_height, next_col, row, .{
            .entity_id = state.entity_id,
            .fg_rgba = fg,
            .bg_rgba = bg,
            .char = 0,
            .font_style = 0,
            .cell_type = .Hidden,
        });
    }
}

// ============ Drawing Primitives ============

fn rasterizeDrawRect(state: *RasterizerState, cells: []TuiCell, payload: []const u8, flags: u16) void {
    if (payload.len < 16) return;
    const x = readU16(payload, 0);
    const y = readU16(payload, 2);
    const w = readU16(payload, 4);
    const h = readU16(payload, 6);
    const bg_rgba = Rgba.fromU32(readU32(payload, 8));
    const fill_char = readU16(payload, 12);
    const font_style = readU16(payload, 14);
    const is_wide = (flags & 0x01) != 0;

    const clip = state.clip_stack.current();
    const visible = clipIntersect(clip, x, y, w, h);
    if (visible.isEmpty()) return;

    const col_step: TuiScale = if (is_wide) 2 else 1;

    // Snap start column to the original Wide-grid alignment.
    // Wide chars occupy pairs (x, x+1), (x+2, x+3), ... — if visible.x
    // lands on a Hidden continuation cell, skip it to avoid misalignment.
    const aligned_x: TuiScale = if (is_wide and (visible.x - x) % 2 != 0) visible.x + 1 else visible.x;

    var row: TuiScale = visible.y;
    while (row < visible.y + visible.height) : (row += 1) {
        var col: TuiScale = aligned_x;
        while (col < visible.x + visible.width) : (col += col_step) {
            if (is_wide) {
                writeWidePair(cells, state, col, row, clip, fill_char, bg_rgba, bg_rgba, font_style);
            } else {
                writeCell(cells, state.frame_width, state.frame_height, col, row, .{
                    .entity_id = state.entity_id,
                    .fg_rgba = bg_rgba,
                    .bg_rgba = bg_rgba,
                    .char = fill_char,
                    .font_style = font_style,
                    .cell_type = .Ascii,
                });
            }
        }
    }
}

fn rasterizeDrawText(state: *RasterizerState, cells: []TuiCell, payload: []const u8) void {
    if (payload.len < 16) return;
    const start_x = readU16(payload, 0);
    const start_y = readU16(payload, 2);
    const fg_rgba = Rgba.fromU32(readU32(payload, 4));
    const bg_rgba = Rgba.fromU32(readU32(payload, 8));
    const font_style = readU16(payload, 12);
    const text_len = readU16(payload, 14);

    if (text_len == 0) return;
    const text_bytes = payload[16..];
    if (text_bytes.len < text_len) return;

    const clip = state.clip_stack.current();
    const row_range = clipRow(clip, start_y, start_x, start_x + text_len);
    if (row_range.start == row_range.end) return;
    const col_min = row_range.start;
    const col_max = row_range.end;

    var col: TuiScale = start_x;

    var utf8_iter = std.unicode.Utf8View.init(text_bytes[0..text_len]) catch return;
    var it = utf8_iter.iterator();
    while (it.nextCodepoint()) |cp| {
        if (col >= col_max) break;
        const wide = isWideCodepoint(cp);

        if (col >= col_min) {
            if (wide) {
                writeWidePair(cells, state, col, start_y, clip, @intCast(cp), fg_rgba, bg_rgba, font_style);
            } else {
                writeCell(cells, state.frame_width, state.frame_height, col, start_y, .{
                    .entity_id = state.entity_id,
                    .fg_rgba = fg_rgba,
                    .bg_rgba = bg_rgba,
                    .char = @intCast(cp),
                    .font_style = font_style,
                    .cell_type = .Ascii,
                });
            }
        }
        col += if (wide) @as(TuiScale, 2) else @as(TuiScale, 1);
    }
}

fn rasterizeDrawBorder(state: *RasterizerState, cells: []TuiCell, payload: []const u8) void {
    if (payload.len < 16) return;
    const x = readU16(payload, 0);
    const y = readU16(payload, 2);
    const w = readU16(payload, 4);
    const h = readU16(payload, 6);
    const color_rgba = Rgba.fromU32(readU32(payload, 8));
    const border_style = payload[12];
    const sides = payload[13];

    if (w < 2 or h < 2) return;
    if (border_style == 0) return;

    const clip = state.clip_stack.current();
    const chars = borderChars(border_style);

    const has_top = (sides & 0x01) != 0;
    const has_right = (sides & 0x02) != 0;
    const has_bottom = (sides & 0x04) != 0;
    const has_left = (sides & 0x08) != 0;

    // Corners — single-cell writes, clip check is cheap
    if (has_top and has_left and clip.contains(x, y))
        writeBorderCell(cells, state, x, y, chars.top_left, color_rgba);
    if (has_top and has_right and clip.contains(x + w - 1, y))
        writeBorderCell(cells, state, x + w - 1, y, chars.top_right, color_rgba);
    if (has_bottom and has_left and clip.contains(x, y + h - 1))
        writeBorderCell(cells, state, x, y + h - 1, chars.bottom_left, color_rgba);
    if (has_bottom and has_right and clip.contains(x + w - 1, y + h - 1))
        writeBorderCell(cells, state, x + w - 1, y + h - 1, chars.bottom_right, color_rgba);

    // Edges — use clipRow to eliminate per-cell clip checks
    if (has_top) drawBorderEdge(cells, state, clip, .horizontal, chars.horizontal, color_rgba, y, if (has_left) x + 1 else x, if (has_right) x + w - 1 else x + w);
    if (has_bottom) drawBorderEdge(cells, state, clip, .horizontal, chars.horizontal, color_rgba, y + h - 1, if (has_left) x + 1 else x, if (has_right) x + w - 1 else x + w);
    if (has_left) drawBorderEdge(cells, state, clip, .vertical, chars.vertical, color_rgba, x, if (has_top) y + 1 else y, if (has_bottom) y + h - 1 else y + h);
    if (has_right) drawBorderEdge(cells, state, clip, .vertical, chars.vertical, color_rgba, x + w - 1, if (has_top) y + 1 else y, if (has_bottom) y + h - 1 else y + h);
}

const EdgeDirection = enum { horizontal, vertical };

fn drawBorderEdge(
    cells: []TuiCell,
    state: *RasterizerState,
    clip: ClipRect,
    dir: EdgeDirection,
    char: u16,
    color: Rgba,
    fixed: TuiScale,
    range_start: TuiScale,
    range_end: TuiScale,
) void {
    switch (dir) {
        .horizontal => {
            const r = clipRow(clip, fixed, range_start, range_end);
            var col: TuiScale = r.start;
            while (col < r.end) : (col += 1) {
                writeBorderCell(cells, state, col, fixed, char, color);
            }
        },
        .vertical => {
            // Intersect vertical strip [range_start, range_end) at column fixed
            if (fixed < clip.x or fixed >= clip.x + clip.width) return;
            const rs = @max(range_start, clip.y);
            const re = @min(range_end, clip.y + clip.height);
            var row: TuiScale = rs;
            while (row < re) : (row += 1) {
                writeBorderCell(cells, state, fixed, row, char, color);
            }
        },
    }
}

fn rasterizeDrawShadow(state: *RasterizerState, cells: []TuiCell, payload: []const u8) void {
    if (payload.len < 16) return;
    const x = readU16(payload, 0);
    const y = readU16(payload, 2);
    const w = readU16(payload, 4);
    const h = readU16(payload, 6);
    const offset_x = readU16(payload, 8);
    const offset_y = readU16(payload, 10);
    const shadow_color = Rgba.fromU32(readU32(payload, 12));

    const clip = state.clip_stack.current();
    const sx: TuiScale = x + offset_x;
    const sy: TuiScale = y + offset_y;

    const visible = clipIntersect(clip, sx, sy, w, h);
    if (visible.isEmpty()) return;

    var row: TuiScale = visible.y;
    while (row < visible.y + visible.height) : (row += 1) {
        var col: TuiScale = visible.x;
        while (col < visible.x + visible.width) : (col += 1) {
            // Skip cells inside the source rectangle
            if (col >= x and col < x + w and row >= y and row < y + h) continue;

            const idx = @as(usize, row) * state.frame_width + col;
            if (idx >= cells.len) continue;

            var cell_bg = cells[idx].bg_rgba;
            cell_bg.alphaCompositing(shadow_color);
            cells[idx].bg_rgba = cell_bg;
        }
    }
}

fn rasterizeDrawFill(state: *RasterizerState, cells: []TuiCell, payload: []const u8) void {
    if (payload.len < 12) return;
    const x = readU16(payload, 0);
    const y = readU16(payload, 2);
    const w = readU16(payload, 4);
    const h = readU16(payload, 6);
    const fill_color = Rgba.fromU32(readU32(payload, 8));

    const clip = state.clip_stack.current();
    const visible = clipIntersect(clip, x, y, w, h);
    if (visible.isEmpty()) return;

    var row: TuiScale = visible.y;
    while (row < visible.y + visible.height) : (row += 1) {
        var col: TuiScale = visible.x;
        while (col < visible.x + visible.width) : (col += 1) {
            const idx = @as(usize, row) * state.frame_width + col;
            if (idx >= cells.len) continue;

            var cell_bg = cells[idx].bg_rgba;
            cell_bg.alphaCompositing(fill_color);
            cells[idx].bg_rgba = cell_bg;
            cells[idx].entity_id = state.entity_id;
        }
    }
}

fn rasterizeDrawChar(state: *RasterizerState, cells: []TuiCell, payload: []const u8, flags: u16) void {
    if (payload.len < 16) return;
    const x = readU16(payload, 0);
    const y = readU16(payload, 2);
    const fg_rgba = Rgba.fromU32(readU32(payload, 4));
    const bg_rgba = Rgba.fromU32(readU32(payload, 8));
    const char = readU16(payload, 12);
    const font_style = readU16(payload, 14);
    const is_wide = (flags & 0x01) != 0;

    const clip = state.clip_stack.current();
    if (!clip.contains(x, y)) return;

    writeCell(cells, state.frame_width, state.frame_height, x, y, .{
        .entity_id = state.entity_id,
        .fg_rgba = fg_rgba,
        .bg_rgba = bg_rgba,
        .char = char,
        .font_style = font_style,
        .cell_type = if (is_wide) .Wide else .Ascii,
    });

    if (is_wide and clip.contains(x + 1, y)) {
        writeCell(cells, state.frame_width, state.frame_height, x + 1, y, .{
            .entity_id = state.entity_id,
            .fg_rgba = fg_rgba,
            .bg_rgba = bg_rgba,
            .char = 0,
            .font_style = 0,
            .cell_type = .Hidden,
        });
    }
}

fn rasterizeDrawLine(state: *RasterizerState, cells: []TuiCell, payload: []const u8) void {
    if (payload.len < 16) return;
    const x = readU16(payload, 0);
    const y = readU16(payload, 2);
    const length = readU16(payload, 4);
    const direction = readU16(payload, 6);
    const color_rgba = Rgba.fromU32(readU32(payload, 8));
    const line_style = payload[12];

    const clip = state.clip_stack.current();
    const line_chars = lineChars(line_style);
    const line_char: u16 = if (direction == 0) line_chars.horizontal else line_chars.vertical;

    var i: TuiScale = 0;
    while (i < length) : (i += 1) {
        const col = if (direction == 0) x + i else x;
        const row = if (direction == 0) y else y + i;
        if (!clip.contains(col, row)) continue;
        writeBorderCell(cells, state, col, row, line_char, color_rgba);
    }
}

// ============ Helpers ============

fn writeCell(cells: []TuiCell, frame_width: TuiScale, frame_height: TuiScale, x: TuiScale, y: TuiScale, new_cell: TuiCell) void {
    if (x >= frame_width or y >= frame_height) return;
    const idx = @as(usize, y) * frame_width + x;
    if (idx >= cells.len) return;

    const existing = cells[idx];

    if (new_cell.bg_rgba.a == 0xFF and new_cell.fg_rgba.a == 0xFF) {
        cells[idx] = new_cell;
    } else {
        // Blend new background over existing
        var bg = new_cell.bg_rgba;
        bg.alphaCompositing(existing.bg_rgba);

        if (new_cell.char == ' ' or new_cell.char == 0) {
            // Background-only overlay: preserve existing character,
            // tint its fg through the overlay color.
            // Exception: Hidden cells are structural markers (wide-char continuations)
            // and must always take precedence over the existing cell_type.
            var fg = new_cell.bg_rgba;
            fg.alphaBlending(existing.fg_rgba);
            cells[idx] = .{
                .entity_id = new_cell.entity_id,
                .fg_rgba = fg,
                .bg_rgba = bg,
                .char = existing.char,
                .font_style = existing.font_style,
                .cell_type = if (new_cell.cell_type == .Hidden) .Hidden else existing.cell_type,
            };
        } else {
            // Text overlay: blend new fg over composited bg
            var fg = new_cell.fg_rgba;
            fg.alphaBlending(bg);
            cells[idx] = .{
                .entity_id = new_cell.entity_id,
                .fg_rgba = fg,
                .bg_rgba = bg,
                .char = new_cell.char,
                .font_style = new_cell.font_style,
                .cell_type = new_cell.cell_type,
            };
        }
    }

    // Wide/Hidden pair integrity: a CJK character occupies two consecutive cells
    // (Wide at col N, Hidden at col N+1). When any operation breaks this pair,
    // both halves must be cleared — a terminal cannot render half of a wide glyph.
    if (existing.cell_type == .Wide and cells[idx].cell_type != .Wide) {
        // Wide cell replaced: clear orphaned Hidden continuation at N+1
        const next_x = x + 1;
        if (next_x < frame_width) {
            const next_idx = @as(usize, y) * frame_width + next_x;
            if (next_idx < cells.len and cells[next_idx].cell_type == .Hidden) {
                cells[next_idx].char = ' ';
                cells[next_idx].cell_type = .Ascii;
                cells[next_idx].font_style = 0;
            }
        }
    } else if (existing.cell_type == .Hidden and cells[idx].cell_type != .Hidden) {
        // Hidden continuation replaced: clear the preceding Wide cell at N-1
        if (x > 0) {
            const prev_idx = @as(usize, y) * frame_width + (x - 1);
            if (cells[prev_idx].cell_type == .Wide) {
                cells[prev_idx].char = ' ';
                cells[prev_idx].cell_type = .Ascii;
                cells[prev_idx].font_style = 0;
            }
        }
    }
}

fn writeBorderCell(cells: []TuiCell, state: *RasterizerState, x: TuiScale, y: TuiScale, char: u16, color: Rgba) void {
    writeCell(cells, state.frame_width, state.frame_height, x, y, .{
        .entity_id = state.entity_id,
        .fg_rgba = color,
        .bg_rgba = state.default_bg,
        .char = char,
        .font_style = 0,
        .cell_type = .Ascii,
    });
}

// ============ Border Character Tables ============

const BorderChars = struct {
    top_left: u16,
    top_right: u16,
    bottom_left: u16,
    bottom_right: u16,
    horizontal: u16,
    vertical: u16,
};

const LineChars = struct {
    horizontal: u16,
    vertical: u16,
};

fn lineChars(style: u8) LineChars {
    return switch (style) {
        0 => .{ // Thin
            .horizontal = 0x2500, // ─
            .vertical = 0x2502, // │
        },
        1 => .{ // Double
            .horizontal = 0x2550, // ═
            .vertical = 0x2551, // ║
        },
        2 => .{ // Bold
            .horizontal = 0x2501, // ━
            .vertical = 0x2503, // ┃
        },
        3 => .{ // Dashed
            .horizontal = 0x2504, // ┄
            .vertical = 0x2506, // ┆
        },
        4 => .{ // Dotted
            .horizontal = 0x2508, // ┈
            .vertical = 0x250A, // ┊
        },
        else => .{ // Fallback to thin
            .horizontal = 0x2500,
            .vertical = 0x2502,
        },
    };
}

fn borderChars(style: u8) BorderChars {
    return switch (style) {
        1 => .{ // Solid
            .top_left = 0x250C, // ┌
            .top_right = 0x2510, // ┐
            .bottom_left = 0x2514, // └
            .bottom_right = 0x2518, // ┘
            .horizontal = 0x2500, // ─
            .vertical = 0x2502, // │
        },
        2 => .{ // Double
            .top_left = 0x2554, // ╔
            .top_right = 0x2557, // ╗
            .bottom_left = 0x255A, // ╚
            .bottom_right = 0x255D, // ╝
            .horizontal = 0x2550, // ═
            .vertical = 0x2551, // ║
        },
        3 => .{ // Rounded
            .top_left = 0x256D, // ╭
            .top_right = 0x256E, // ╮
            .bottom_left = 0x2570, // ╰
            .bottom_right = 0x256F, // ╯
            .horizontal = 0x2500, // ─
            .vertical = 0x2502, // │
        },
        4 => .{ // Bold
            .top_left = 0x250F, // ┏
            .top_right = 0x2513, // ┓
            .bottom_left = 0x2517, // ┗
            .bottom_right = 0x251B, // ┛
            .horizontal = 0x2501, // ━
            .vertical = 0x2503, // ┃
        },
        5 => .{ // Dashed
            .top_left = 0x250C, // ┌
            .top_right = 0x2510, // ┐
            .bottom_left = 0x2514, // └
            .bottom_right = 0x2518, // ┘
            .horizontal = 0x2504, // ┄
            .vertical = 0x2506, // ┆
        },
        6 => .{ // Dotted
            .top_left = 0x250C, // ┌
            .top_right = 0x2510, // ┐
            .bottom_left = 0x2514, // └
            .bottom_right = 0x2518, // ┘
            .horizontal = 0x2508, // ┈
            .vertical = 0x250A, // ┊
        },
        7 => .{ // OutsetBold
            .top_left = 0x2514, // └ (swapped for outset effect)
            .top_right = 0x2518, // ┘
            .bottom_left = 0x250C, // ┌
            .bottom_right = 0x2510, // ┐
            .horizontal = 0x2501, // ━
            .vertical = 0x2503, // ┃
        },
        8 => .{ // OutsetDouble
            .top_left = 0x255A, // ╚ (swapped for outset effect)
            .top_right = 0x255D, // ╝
            .bottom_left = 0x2554, // ╔
            .bottom_right = 0x2557, // ╗
            .horizontal = 0x2550, // ═
            .vertical = 0x2551, // ║
        },
        else => .{ // Fallback to solid
            .top_left = 0x250C,
            .top_right = 0x2510,
            .bottom_left = 0x2514,
            .bottom_right = 0x2518,
            .horizontal = 0x2500,
            .vertical = 0x2502,
        },
    };
}

// ============ Codepoint Width ============

fn isWideCodepoint(cp: u32) bool {
    if (cp < 0x1100) return false;
    // CJK Unified Ideographs
    if (cp >= 0x4E00 and cp <= 0x9FFF) return true;
    // CJK Extension A
    if (cp >= 0x3400 and cp <= 0x4DBF) return true;
    // Hangul Syllables
    if (cp >= 0xAC00 and cp <= 0xD7AF) return true;
    // CJK Compatibility Ideographs
    if (cp >= 0xF900 and cp <= 0xFAFF) return true;
    // Halfwidth and Fullwidth Forms
    if (cp >= 0xFF01 and cp <= 0xFF60) return true;
    // CJK Extension B and beyond
    if (cp >= 0x20000 and cp <= 0x2FFFD) return true;
    // Katakana, Hiragana, Bopomofo
    if (cp >= 0x3040 and cp <= 0x33FF) return true;
    // Fullwidth punctuation, CJK symbols
    if (cp >= 0x3000 and cp <= 0x303F) return true;
    return false;
}

// ============ Binary Reading Helpers ============

const readU16 = binary.readU16;
const readU32 = binary.readU32;
const readU64 = binary.readU64;
