const esc = "\x1B";
const csi = esc ++ "[";

pub fn disableLineWrap(writer: anytype) !void {
    try writer.writeAll(csi ++ "?7l");
}

pub fn disableLineWrapAndFlush(writer: anytype) !void {
    try disableLineWrap(writer);
    try writer.flush();
}

pub fn enableLineWrap(writer: anytype) !void {
    try writer.writeAll(csi ++ "?7h");
}

pub fn enableLineWrapAndFlush(writer: anytype) !void {
    try enableLineWrap(writer);
    try writer.flush();
}

pub fn saveScreen(writer: anytype) !void {
    try writer.writeAll(csi ++ "?47h");
}

pub fn saveScreenAndFlush(writer: anytype) !void {
    try saveScreen(writer);
    try writer.flush();
}

pub fn restoreScreen(writer: anytype) !void {
    try writer.writeAll(csi ++ "?47l");
}

pub fn restoreScreenAndFlush(writer: anytype) !void {
    try restoreScreen(writer);
    try writer.flush();
}

pub fn enterAlternateScreen(writer: anytype) !void {
    try writer.writeAll(csi ++ "?1049h");
}

pub fn enterAlternateScreenAndFlush(writer: anytype) !void {
    try enterAlternateScreen(writer);
    try writer.flush();
}

pub fn leaveAlternateScreen(writer: anytype) !void {
    try writer.writeAll(csi ++ "?1049l");
}

pub fn leaveAlternateScreenAndFlush(writer: anytype) !void {
    try leaveAlternateScreen(writer);
    try writer.flush();
}

pub fn setSize(writer: anytype, columns: u16, rows: u16) !void {
    try writer.print(csi ++ "8;{d};{d}t", .{ rows, columns });
}

pub fn setSizeAndFlush(writer: anytype, columns: u16, rows: u16) !void {
    try setSize(writer, columns, rows);
    try writer.flush();
}

pub fn setTitle(writer: anytype, title: []const u8) !void {
    try writer.print(esc ++ "]0;{s}\x07", .{title});
}

pub fn setTitleAndFlush(writer: anytype, title: []const u8) !void {
    try setTitle(writer, title);
    try writer.flush();
}

pub fn beginSynchronizedUpdate(writer: anytype) !void {
    try writer.writeAll(csi ++ "?2026h");
}

pub fn beginSynchronizedUpdateAndFlush(writer: anytype) !void {
    try beginSynchronizedUpdate(writer);
    try writer.flush();
}

pub fn endSynchronizedUpdate(writer: anytype) !void {
    try writer.writeAll(csi ++ "?2026l");
}

pub fn endSynchronizedUpdateAndFlush(writer: anytype) !void {
    try endSynchronizedUpdate(writer);
    try writer.flush();
}

const std = @import("std");
const testing = std.testing;

test "disableLineWrap writes ?7l" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try disableLineWrap(&fw);
    try testing.expectEqualSlices(u8, "\x1B[?7l", fw.buffer[0..fw.end]);
}

test "enableLineWrap writes ?7h" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try enableLineWrap(&fw);
    try testing.expectEqualSlices(u8, "\x1B[?7h", fw.buffer[0..fw.end]);
}

test "saveScreen writes ?47h" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try saveScreen(&fw);
    try testing.expectEqualSlices(u8, "\x1B[?47h", fw.buffer[0..fw.end]);
}

test "restoreScreen writes ?47l" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try restoreScreen(&fw);
    try testing.expectEqualSlices(u8, "\x1B[?47l", fw.buffer[0..fw.end]);
}

test "enterAlternateScreen writes ?1049h" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try enterAlternateScreen(&fw);
    try testing.expectEqualSlices(u8, "\x1B[?1049h", fw.buffer[0..fw.end]);
}

test "leaveAlternateScreen writes ?1049l" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try leaveAlternateScreen(&fw);
    try testing.expectEqualSlices(u8, "\x1B[?1049l", fw.buffer[0..fw.end]);
}

test "setSize writes correct escape" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try setSize(&fw, 80, 24);
    try testing.expectEqualSlices(u8, "\x1B[8;24;80t", fw.buffer[0..fw.end]);
}

test "setTitle writes correct escape" {
    var buf: [128]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try setTitle(&fw, "test");
    try testing.expectEqualSlices(u8, "\x1B]0;test\x07", fw.buffer[0..fw.end]);
}

test "beginSynchronizedUpdate writes ?2026h" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try beginSynchronizedUpdate(&fw);
    try testing.expectEqualSlices(u8, "\x1B[?2026h", fw.buffer[0..fw.end]);
}

test "endSynchronizedUpdate writes ?2026l" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try endSynchronizedUpdate(&fw);
    try testing.expectEqualSlices(u8, "\x1B[?2026l", fw.buffer[0..fw.end]);
}
