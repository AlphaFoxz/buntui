const std = @import("std");
const testing = std.testing;

test "cn char len" {
    var c: []const u8 = "你";
    try testing.expectEqual(std.unicode.utf8ByteSequenceLength(c[0]), 3);
    c = "1";
    try testing.expectEqual(std.unicode.utf8ByteSequenceLength(c[0]), 1);
}
