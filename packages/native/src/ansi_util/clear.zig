const esc = "\x1B";
const csi = esc ++ "[";

pub fn clearCurrentLine(writer: anytype) !void {
    try writer.writeAll(csi ++ "2K");
}

pub fn clearCurrentLineAndFlush(writer: anytype) !void {
    try clearCurrentLine(writer);
    try writer.flush();
}

pub fn clearFromCursorToLineBeginning(writer: anytype) !void {
    try writer.writeAll(csi ++ "1K");
}

pub fn clearFromCursorToLineBeginningAndFlush(writer: anytype) !void {
    try clearFromCursorToLineBeginning(writer);
    try writer.flush();
}

pub fn clearFromCursorToLineEnd(writer: anytype) !void {
    try writer.writeAll(csi ++ "K");
}

pub fn clearFromCursorToLineEndAndFlush(writer: anytype) !void {
    try clearFromCursorToLineEnd(writer);
    try writer.flush();
}

pub fn clearScreen(writer: anytype) !void {
    try writer.writeAll(csi ++ "2J");
}

pub fn clearScreenAndFlush(writer: anytype) !void {
    try clearScreen(writer);
    try writer.flush();
}

pub fn clearFromCursorToScreenBeginning(writer: anytype) !void {
    try writer.writeAll(csi ++ "1J");
}

pub fn clearFromCursorToScreenBeginningAndFlush(writer: anytype) !void {
    try clearFromCursorToScreenBeginning(writer);
    try writer.flush();
}

pub fn clearFromCursorToScreenEnd(writer: anytype) !void {
    try writer.writeAll(csi ++ "J");
}

pub fn clearFromCursorToScreenEndAndFlush(writer: anytype) !void {
    try clearFromCursorToScreenEnd(writer);
    try writer.flush();
}

const std = @import("std");
const testing = std.testing;
const csi_local = "\x1B[";

test "clearCurrentLine writes 2K" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try clearCurrentLine(&fw);
    try testing.expectEqualSlices(u8, csi_local ++ "2K", fw.buffer[0..fw.end]);
}

test "clearFromCursorToLineBeginning writes 1K" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try clearFromCursorToLineBeginning(&fw);
    try testing.expectEqualSlices(u8, csi_local ++ "1K", fw.buffer[0..fw.end]);
}

test "clearFromCursorToLineEnd writes K" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try clearFromCursorToLineEnd(&fw);
    try testing.expectEqualSlices(u8, csi_local ++ "K", fw.buffer[0..fw.end]);
}

test "clearScreen writes 2J" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try clearScreen(&fw);
    try testing.expectEqualSlices(u8, csi_local ++ "2J", fw.buffer[0..fw.end]);
}

test "clearFromCursorToScreenBeginning writes 1J" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try clearFromCursorToScreenBeginning(&fw);
    try testing.expectEqualSlices(u8, csi_local ++ "1J", fw.buffer[0..fw.end]);
}

test "clearFromCursorToScreenEnd writes J" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try clearFromCursorToScreenEnd(&fw);
    try testing.expectEqualSlices(u8, csi_local ++ "J", fw.buffer[0..fw.end]);
}
