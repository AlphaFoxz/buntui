const std = @import("std");
const testing = std.testing;
const esc = "\x1B";
const csi = esc ++ "[";

pub const CursorMode = enum(u8) {
    blinking_block = 1,
    block,
    blinking_underscore,
    underscore,
    blinking_I_beam,
    I_beam,
};

pub fn setCursorMode(writer: anytype, mode: CursorMode) !void {
    const modeNumber = @intFromEnum(mode);
    try writer.print(csi ++ "{d} q", .{modeNumber});
}

pub fn setCursorModeAndFlush(writer: anytype, mode: CursorMode) !void {
    try setCursorMode(writer, mode);
    try writer.flush();
}

pub fn hideCursor(writer: anytype) !void {
    try writer.writeAll(csi ++ "?25l");
}

pub fn hideCursorAndFlush(writer: anytype) !void {
    try hideCursor(writer);
    try writer.flush();
}

pub fn showCursor(writer: anytype) !void {
    try writer.writeAll(csi ++ "?25h");
}

pub fn showCursorAndFlush(writer: anytype) !void {
    try showCursor(writer);
    try writer.flush();
}

pub fn saveCursor(writer: anytype) !void {
    try writer.writeAll(csi ++ "s");
}

pub fn saveCursorAndFlush(writer: anytype) !void {
    try saveCursor(writer);
    try writer.flush();
}

pub fn restoreCursor(writer: anytype) !void {
    try writer.writeAll(csi ++ "u");
}

pub fn restoreCursorAndFlush(writer: anytype) !void {
    try restoreCursor(writer);
    try writer.flush();
}

pub fn setCursor(writer: anytype, x: usize, y: usize) !void {
    try writer.print(csi ++ "{};{}H", .{ y + 1, x + 1 });
}

pub fn setCursorAndFlush(writer: anytype, x: usize, y: usize) !void {
    try setCursor(writer, x, y);
    try writer.flush();
}

pub fn setCursorRow(writer: anytype, row: usize) !void {
    try writer.print(csi ++ "{}H", .{row + 1});
}

pub fn setCursorRowAndFlush(writer: anytype, row: usize) !void {
    try setCursorRow(writer, row);
    try writer.flush();
}

pub fn setCursorColumn(writer: anytype, column: usize) !void {
    try writer.print(csi ++ "{}G", .{column + 1});
}

pub fn setCursorColumnAndFlush(writer: anytype, column: usize) !void {
    try setCursorColumn(writer, column);
    try writer.flush();
}

pub fn cursorUp(writer: anytype, lines: usize) !void {
    try writer.print(csi ++ "{}A", .{lines});
}

pub fn cursorUpAndFlush(writer: anytype, lines: usize) !void {
    try cursorUp(writer, lines);
    try writer.flush();
}

pub fn cursorDown(writer: anytype, lines: usize) !void {
    try writer.print(csi ++ "{}B", .{lines});
}

pub fn cursorDownAndFlush(writer: anytype, lines: usize) !void {
    try cursorDown(writer, lines);
    try writer.flush();
}

pub fn cursorForward(writer: anytype, columns: usize) !void {
    try writer.print(csi ++ "{}C", .{columns});
}

pub fn cursorForwardAndFlush(writer: anytype, columns: usize) !void {
    try cursorForward(writer, columns);
    try writer.flush();
}

pub fn cursorBackward(writer: anytype, columns: usize) !void {
    try writer.print(csi ++ "{}D", .{columns});
}

pub fn cursorBackwardAndFlush(writer: anytype, columns: usize) !void {
    try cursorBackward(writer, columns);
    try writer.flush();
}

pub fn cursorNextLine(writer: anytype, lines: usize) !void {
    try writer.print(csi ++ "{}E", .{lines});
}

pub fn cursorNextLineAndFlush(writer: anytype, lines: usize) !void {
    try cursorNextLine(writer, lines);
    try writer.flush();
}

pub fn cursorPreviousLine(writer: anytype, lines: usize) !void {
    try writer.print(csi ++ "{}F", .{lines});
}

pub fn cursorPreviousLineAndFlush(writer: anytype, lines: usize) !void {
    try cursorPreviousLine(writer, lines);
    try writer.flush();
}

pub fn scrollUp(writer: anytype, lines: usize) !void {
    try writer.print(csi ++ "{}S", .{lines});
}

pub fn scrollUpAndFlush(writer: anytype, lines: usize) !void {
    try scrollUp(writer, lines);
    try writer.flush();
}

pub fn scrollDown(writer: anytype, lines: usize) !void {
    try writer.print(csi ++ "{}T", .{lines});
}

pub fn scrollDownAndFlush(writer: anytype, lines: usize) !void {
    try scrollDown(writer, lines);
    try writer.flush();
}

test "test cursor mode BLINKING_UNDERSCORE" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try setCursorMode(&fw, .blinking_underscore);
    // the space is needed
    const expected = csi ++ "3 q";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "test cursor mode BLINKING_I_BEAM" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try setCursorMode(&fw, .blinking_I_beam);
    // the space is needed
    const expected = csi ++ "5 q";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}
