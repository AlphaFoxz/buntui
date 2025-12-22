const std = @import("std");
const logger = @import("./logger.zig");

pub fn outOfMemory() noreturn {
    logger.logError("Out of memory");
    std.process.exit(101);
}

pub fn unsupportedOS() noreturn {
    logger.logError("Unsupported OS");
    std.process.exit(102);
}

pub fn osApiError(msg: []const u8) noreturn {
    logger.logErrorFmt("OS API error: {s}", .{msg});
    std.process.exit(103);
}
