const std = @import("std");
pub const clear = @import("./ansi_util/clear.zig");
pub const cursor = @import("./ansi_util/cursor.zig");
pub const format = @import("./ansi_util/format.zig");
pub const style = @import("./ansi_util/style.zig");
pub const terminal = @import("./ansi_util/terminal.zig");

pub fn writeAll(writer: anytype, str: []const u8) !void {
    try writer.writeAll(str);
}

pub fn writeAllAndFlush(writer: anytype, str: []const u8) !void {
    try writeAll(writer, str);
    try writer.flush();
}

pub fn writeAllToPos(writer: anytype, x: usize, y: usize, str: []const u8) !void {
    try writer.print("\x1B[{d};{d}H{s}", .{ y + 1, x + 1, str });
}

pub fn writeAllToPosAndFlush(writer: anytype, x: usize, y: usize, str: []const u8) !void {
    try writeAllToPos(writer, x, y, str);
    try writer.flush();
}

pub fn writeCharToPos(writer: anytype, x: usize, y: usize, char: u16) !void {
    try writer.print("\x1B[{d};{d}H{u}", .{ y + 1, x + 1, char });
}

pub fn writeCharToPosAndFlush(writer: anytype, x: usize, y: usize, char: u16) !void {
    try writeCharToPos(writer, x, y, char);
    try writer.flush();
}

pub fn print(writer: anytype, comptime fmt: []const u8, args: anytype) !void {
    try writer.print(fmt, args);
}

pub fn printAndFlush(writer: anytype, comptime fmt: []const u8, args: anytype) !void {
    try print(writer, fmt, args);
    try writer.flush();
}

pub fn printToPos(writer: anytype, x: usize, y: usize, comptime fmt: []const u8, args: anytype) !void {
    try writer.print("\x1B[{d};{d}H" ++ fmt, .{ y + 1, x + 1 } ++ args);
}

pub fn printToPosAndFlush(writer: anytype, x: usize, y: usize, comptime fmt: []const u8, args: anytype) !void {
    try printToPos(writer, x, y, fmt, args);
    try writer.flush();
}

const testing = std.testing;

test "writeAll outputs string" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try writeAll(&fw, "hello");
    try testing.expectEqualSlices(u8, "hello", fw.buffer[0..fw.end]);
}

test "writeCharToPos outputs correct escape" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try writeCharToPos(&fw, 5, 3, 'X');
    try testing.expectEqualSlices(u8, "\x1B[4;6HX", fw.buffer[0..fw.end]);
}

test "writeAllToPos outputs correct escape" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try writeAllToPos(&fw, 1, 1, "Hi");
    try testing.expectEqualSlices(u8, "\x1B[2;2HHi", fw.buffer[0..fw.end]);
}

test "printToPos outputs formatted escape" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try printToPos(&fw, 0, 0, "{d}", .{42});
    try testing.expectEqualSlices(u8, "\x1B[1;1H42", fw.buffer[0..fw.end]);
}

test "print outputs formatted string" {
    var buf: [64]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    try print(&fw, "{s}{d}", .{ "val", 7 });
    try testing.expectEqualSlices(u8, "val7", fw.buffer[0..fw.end]);
}
