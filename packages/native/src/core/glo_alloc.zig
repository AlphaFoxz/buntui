const std = @import("std");
const builtin = @import("builtin");

var g_safe_alloc_inst = std.heap.SafeAllocator.init(std.heap.c_allocator, .{});
var debug_alloc: std.mem.Allocator = undefined;
var debug_mode = false;

pub inline fn allocator() std.mem.Allocator {
    if (debug_mode) {
        return debug_alloc;
    }
    return std.heap.c_allocator;
}

pub fn debugMode() void {
    if (!builtin.is_test) {
        @compileError("debugMode can only be called in test mode");
    }
    debug_alloc = g_safe_alloc_inst.allocator();
    debug_mode = true;
}
