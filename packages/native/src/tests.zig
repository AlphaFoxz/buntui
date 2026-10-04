const err = @import("./core/error.zig");

// Test-only entry point. Imports modules with new tests.
const event_bus = @import("core/event_bus.zig");
const event_payloads = @import("core/event_payloads.zig");
const tui_context = @import("core/tui_context.zig");
const clip_stack = @import("draw_list/clip_stack.zig");
const commands = @import("draw_list/commands.zig");
const binary = @import("draw_list/binary.zig");
const style = @import("ansi_util/style.zig");
const parse_style = @import("ansi_util/parse_style.zig");
const format = @import("ansi_util/format.zig");
const cursor = @import("ansi_util/cursor.zig");
const clear = @import("ansi_util/clear.zig");
const terminal = @import("ansi_util/terminal.zig");
const ansi_util = @import("ansi_util.zig");
const frame = @import("render/frame.zig");
const typedef = @import("core/typedef.zig");
const platform = @import("core/platform.zig");
const error_ = @import("core/error.zig");
const builtin = @import("builtin");
const input_listener = switch (builtin.os.tag) {
    .linux, .macos, .freebsd, .netbsd, .openbsd => @import("input/posix_listener.zig"),
    .windows => @import("input/windows_listener.zig"),
    else => err.unsupportedOS(),
};

comptime {
    _ = event_bus;
    _ = event_payloads;
    _ = tui_context;
    _ = clip_stack;
    _ = commands;
    _ = binary;
    _ = style;
    _ = parse_style;
    _ = format;
    _ = cursor;
    _ = clear;
    _ = terminal;
    _ = ansi_util;
    _ = frame;
    _ = typedef;
    _ = platform;
    _ = error_;
    _ = input_listener;
}
