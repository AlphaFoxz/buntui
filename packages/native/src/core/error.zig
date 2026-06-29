const std = @import("std");
const logger = @import("./logger.zig");
const platform = @import("./platform.zig");

const is_wasm = platform.is_wasm;

pub fn outOfMemory() noreturn {
    if (comptime is_wasm) {
        logger.logError("Out of memory");
        @trap();
    }
    logger.logError("Out of memory");
    std.process.exit(101);
}

pub fn unsupportedOS() noreturn {
    if (comptime is_wasm) {
        logger.logError("Unsupported OS");
        @trap();
    }
    logger.logError("Unsupported OS");
    std.process.exit(102);
}

pub fn osApiError(msg: []const u8) noreturn {
    if (comptime is_wasm) {
        logger.logErrorFmt("OS API error: {s}", .{msg});
        @trap();
    }
    logger.logErrorFmt("OS API error: {s}", .{msg});
    std.process.exit(103);
}

pub fn osApiErrorFmt(comptime fmt: []const u8, args: anytype) noreturn {
    if (comptime is_wasm) {
        logger.logErrorFmt("OS API error: " ++ fmt, args);
        @trap();
    }
    logger.logErrorFmt("OS API error: " ++ fmt, args);
    std.process.exit(103);
}

test "outOfMemory is noreturn" {
    try std.testing.expect(@typeInfo(@TypeOf(outOfMemory)).@"fn".return_type.? == noreturn);
}

test "unsupportedOS is noreturn" {
    try std.testing.expect(@typeInfo(@TypeOf(unsupportedOS)).@"fn".return_type.? == noreturn);
}

test "osApiError is noreturn" {
    try std.testing.expect(@typeInfo(@TypeOf(osApiError)).@"fn".return_type.? == noreturn);
}

test "osApiErrorFmt is noreturn" {
    try std.testing.expect(@typeInfo(@TypeOf(osApiErrorFmt)).@"fn".return_type.? == noreturn);
}
