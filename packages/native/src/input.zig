const std = @import("std");
const builtin = @import("builtin");
const err = @import("./core/error.zig");

const mode = switch (builtin.os.tag) {
    // See https://github.com/marlersoft/zigwin32/blob/5587b16fa040573846a6bf531301f6206d31a6bf/win32/system/console.zig
    .windows => @import("./input/windows_mode.zig"),
    .linux, .macos, .freebsd, .netbsd, .openbsd => @import("./input/posix_mode.zig"),
    else => err.unsupportedOS(),
};
const listener = switch (builtin.os.tag) {
    // See https://github.com/marlersoft/zigwin32/blob/5587b16fa040573846a6bf531301f6206d31a6bf/win32/system/console.zig
    .windows => @import("./input/windows_listener.zig"),
    .linux, .macos, .freebsd, .netbsd, .openbsd => @import("./input/posix_listener.zig"),
    else => err.unsupportedOS(),
};

pub fn startListening() void {
    mode.updateOutputCP2UTF8();
    mode.switchMouseInputMode();
    listener.start();
}

pub fn stopListening() void {
    defer mode.switchDefaultInputMode();
    defer mode.restoreOutputCP();
    listener.stop();
}
