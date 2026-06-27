// Test-only entry point. Imports modules with new tests.
const event_bus = @import("core/event_bus.zig");
const event_payloads = @import("core/event_payloads.zig");
const tui_context = @import("core/tui_context.zig");
const clip_stack = @import("draw_list/clip_stack.zig");
const commands = @import("draw_list/commands.zig");
const style = @import("ansi_util/style.zig");
const parse_style = @import("ansi_util/parse_style.zig");
const format = @import("ansi_util/format.zig");
const cursor = @import("ansi_util/cursor.zig");

comptime {
    _ = event_bus;
    _ = event_payloads;
    _ = tui_context;
    _ = clip_stack;
    _ = commands;
    _ = style;
    _ = parse_style;
    _ = format;
    _ = cursor;
}
