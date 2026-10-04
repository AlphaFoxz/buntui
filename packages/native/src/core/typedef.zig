pub const TuiScale = i16;

pub const Bool = enum(u8) {
    False = 0,
    True = 1,
};

const std = @import("std");
const testing = std.testing;

test "TuiScale is i16" {
    const x: TuiScale = -1;
    try testing.expectEqual(@as(i16, -1), x);
    const y: TuiScale = 32767;
    try testing.expectEqual(@as(i16, 32767), y);
}

test "Bool False is 0" {
    try testing.expectEqual(@as(u8, 0), @intFromEnum(Bool.False));
}

test "Bool True is 1" {
    try testing.expectEqual(@as(u8, 1), @intFromEnum(Bool.True));
}
