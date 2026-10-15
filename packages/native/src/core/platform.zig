const builtin = @import("builtin");

pub const is_wasm = builtin.target.cpu.arch == .wasm32;

pub const is_posix = builtin.target.os.tag == .linux or builtin.target.os.tag == .macos or builtin.target.os.tag == .freebsd or builtin.target.os.tag == .netbsd or builtin.target.os.tag == .openbsd;

pub const is_windows = builtin.target.os.tag == .windows;

const std = @import("std");

test "platform constants are bools" {
    try std.testing.expect(is_wasm == false or is_wasm == true);
    try std.testing.expect(is_posix == false or is_posix == true);
    try std.testing.expect(is_windows == false or is_windows == true);
}

test "platform is mutually exclusive" {
    const count = @as(u3, @intFromBool(is_wasm)) +
        @as(u3, @intFromBool(is_posix)) +
        @as(u3, @intFromBool(is_windows));
    try std.testing.expect(count == 1);
}
