// Test-only entry point. Imports modules with new tests.
const event_bus = @import("core/event_bus.zig");
const event_payloads = @import("core/event_payloads.zig");
const clip_stack = @import("draw_list/clip_stack.zig");
const commands = @import("draw_list/commands.zig");

comptime {
    _ = event_bus;
    _ = event_payloads;
    _ = clip_stack;
    _ = commands;
}
