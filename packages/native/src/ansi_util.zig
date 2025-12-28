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
