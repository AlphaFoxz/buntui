const std = @import("std");
const builtin = @import("builtin");

pub inline fn assertCompileWithWindows() void {
    comptime {
        if (builtin.os.tag != .windows) {
            @compileError("windows only");
        }
    }
}

pub inline fn assertCompileWithPosix() void {
    comptime {
        switch (builtin.os.tag) {
            .linux, .macos, .freebsd, .netbsd, .openbsd => {},
            else => @compileError("posix only"),
        }
    }
}
