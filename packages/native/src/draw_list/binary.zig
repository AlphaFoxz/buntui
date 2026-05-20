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
