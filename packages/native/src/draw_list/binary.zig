pub inline fn readU16(buf: []const u8, offset: usize) u16 {
    return @as(u16, buf[offset]) |
        (@as(u16, buf[offset + 1]) << 8);
}

pub inline fn readI16(buf: []const u8, offset: usize) i16 {
    return @bitCast(readU16(buf, offset));
}

pub inline fn readU32(buf: []const u8, offset: usize) u32 {
    return @as(u32, buf[offset]) |
        (@as(u32, buf[offset + 1]) << 8) |
        (@as(u32, buf[offset + 2]) << 16) |
        (@as(u32, buf[offset + 3]) << 24);
}

pub inline fn readU64(buf: []const u8, offset: usize) u64 {
    return @as(u64, buf[offset]) |
        (@as(u64, buf[offset + 1]) << 8) |
        (@as(u64, buf[offset + 2]) << 16) |
        (@as(u64, buf[offset + 3]) << 24) |
        (@as(u64, buf[offset + 4]) << 32) |
        (@as(u64, buf[offset + 5]) << 40) |
        (@as(u64, buf[offset + 6]) << 48) |
        (@as(u64, buf[offset + 7]) << 56);
}

const std = @import("std");

test "readU16 zero" {
    const buf = [_]u8{ 0, 0 };
    try std.testing.expectEqual(@as(u16, 0), readU16(&buf, 0));
}

test "readU16 little-endian" {
    const buf = [_]u8{ 0x34, 0x12 };
    try std.testing.expectEqual(@as(u16, 0x1234), readU16(&buf, 0));
}

test "readU16 max value" {
    const buf = [_]u8{ 0xFF, 0xFF };
    try std.testing.expectEqual(@as(u16, 0xFFFF), readU16(&buf, 0));
}

test "readU16 offset" {
    const buf = [_]u8{ 0x00, 0x00, 0xCD, 0xAB };
    try std.testing.expectEqual(@as(u16, 0xABCD), readU16(&buf, 2));
}

test "readI16 positive" {
    const buf = [_]u8{ 0x0A, 0x00 };
    try std.testing.expectEqual(@as(i16, 10), readI16(&buf, 0));
}

test "readI16 negative" {
    const buf = [_]u8{ 0xF6, 0xFF };
    try std.testing.expectEqual(@as(i16, -10), readI16(&buf, 0));
}

test "readU32 little-endian" {
    const buf = [_]u8{ 0x78, 0x56, 0x34, 0x12 };
    try std.testing.expectEqual(@as(u32, 0x12345678), readU32(&buf, 0));
}

test "readU32 zero" {
    const buf = [_]u8{ 0, 0, 0, 0 };
    try std.testing.expectEqual(@as(u32, 0), readU32(&buf, 0));
}

test "readU32 max value" {
    const buf = [_]u8{ 0xFF, 0xFF, 0xFF, 0xFF };
    try std.testing.expectEqual(@as(u32, 0xFFFFFFFF), readU32(&buf, 0));
}

test "readU64 little-endian" {
    const buf = [_]u8{ 0xEF, 0xCD, 0xAB, 0x89, 0x67, 0x45, 0x23, 0x01 };
    try std.testing.expectEqual(@as(u64, 0x0123456789ABCDEF), readU64(&buf, 0));
}

test "readU64 zero" {
    const buf = [_]u8{ 0, 0, 0, 0, 0, 0, 0, 0 };
    try std.testing.expectEqual(@as(u64, 0), readU64(&buf, 0));
}

test "readU64 max value" {
    const buf = [_]u8{ 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF };
    try std.testing.expectEqual(@as(u64, 0xFFFFFFFFFFFFFFFF), readU64(&buf, 0));
}
