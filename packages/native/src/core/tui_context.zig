const std = @import("std");
const builtin = @import("builtin");
const std_io = @import("./std_io.zig");
const logger = @import("./logger.zig");
const err = @import("./error.zig");
const glo_alloc = @import("./glo_alloc.zig");
const TuiScale = @import("./typedef.zig").TuiScale;
const Bool = @import("./typedef.zig").Bool;
const compile = @import("./compile.zig");

pub const TuiResizeBehavior = enum(u8) {
    Fixed = 0,
    Auto = 1,
};

pub const TuiContext = extern struct {
    tick: u64,
    x: TuiScale,
    y: TuiScale,
    rows: TuiScale,
    cols: TuiScale,
    resize_behavior: TuiResizeBehavior,
    debug_mode: Bool,
};

pub fn detectTermSize(context: *TuiContext) void {
    context.x = 0;
    context.y = 0;
    context.rows = 35;
    context.cols = 90;

    switch (builtin.os.tag) {
        .windows => {
            detectWindowsTermRect(context);
        },
        .linux, .macos, .freebsd, .netbsd, .openbsd => {
            detectPosixTermRect(context);
        },
        else => {
            err.unsupportedOS();
        },
    }
}

const SMALL_RECT = extern struct {
    Left: i16,
    Top: i16,
    Right: i16,
    Bottom: i16,
};

const CONSOLE_SCREEN_BUFFER_INFO = extern struct {
    dwSize: std.os.windows.COORD,
    dwCursorPosition: std.os.windows.COORD,
    wAttributes: u16,
    srWindow: SMALL_RECT,
    dwMaximumWindowSize: std.os.windows.COORD,
};

extern "kernel32" fn GetConsoleScreenBufferInfo(
    hConsoleOutput: ?std.os.windows.HANDLE,
    lpConsoleScreenBufferInfo: *CONSOLE_SCREEN_BUFFER_INFO,
) callconv(.winapi) std.os.windows.BOOL;

inline fn detectWindowsTermRect(context: *TuiContext) void {
    compile.assertCompileWithWindows();

    const stdout = std.Io.File.stdout();
    const fd = stdout.handle;
    var info: CONSOLE_SCREEN_BUFFER_INFO = undefined;
    if (GetConsoleScreenBufferInfo(fd, &info) == .FALSE) {
        logger.logError("GetConsoleScreenBufferInfo failed");
        return;
    }
    logger.logInfoFmt("detected console srWindow info [Top: {d} Right: {d} Bottom: {d} Left: {d}]", .{
        info.srWindow.Top,
        info.srWindow.Right,
        info.srWindow.Bottom,
        info.srWindow.Left,
    });
    logger.logInfoFmt("detected console dwSize info [X: {d} Y: {d}]", .{
        info.dwSize.X,
        info.dwSize.Y,
    });
    context.cols = @intCast(info.dwSize.X);
    context.rows = @intCast(info.dwSize.Y);
}
inline fn detectPosixTermRect(context: *TuiContext) void {
    compile.assertCompileWithPosix();

    const stdout = std.Io.File.stdout();
    const fd = stdout.handle;
    const posix = std.posix;
    var winsize: posix.winsize = .{
        .row = 0,
        .col = 0,
        .xpixel = 0,
        .ypixel = 0,
    };
    const errno = posix.system.ioctl(fd, posix.T.IOCGWINSZ, @intFromPtr(&winsize));
    if (posix.errno(errno) != .SUCCESS) {
        logger.logError("posix cannot call ioctl");
        return;
    }
    context.cols = winsize.col;
    context.rows = winsize.row;
}

test "screen_rect" {
    const testing = std.testing;
    var context = TuiContext{
        .x = 0,
        .y = 0,
        .rows = 0,
        .cols = 0,
        .resize_behavior = .Auto,
    };
    detectTermSize(&context);
    try testing.expect(context.cols > 10);
    try testing.expect(context.rows > 10);
}
