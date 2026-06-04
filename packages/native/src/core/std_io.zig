const std = @import("std");
const Io = std.Io;
const platform = @import("./platform.zig");

const is_wasm = platform.is_wasm;

var writeBuf: [35 * 90]u8 = undefined;
pub var writer: std.Io.File.Writer = undefined;
var writerInit: bool = false;

var readBuf: [35 * 90]u8 = undefined;
pub var reader: std.Io.File.Reader = undefined;
var readerInit: bool = false;

var threaded: std.Io.Threaded = undefined;
var threadedInit: bool = false;

var wasm_output_buf: std.ArrayList(u8) = .empty;
const wasm_alloc = std.heap.c_allocator;

fn ensureThreaded() void {
    if (!threadedInit) {
        threadedInit = true;
        threaded = std.Io.Threaded.init(
            std.heap.c_allocator,
            .{
                .stack_size = 1024 * 1024,
                .argv0 = undefined,
            },
        );
    }
}

pub fn init() void {
    if (!writerInit) {
        writerInit = true;
        if (comptime is_wasm) {
            writer = .{
                .io = undefined,
                .file = undefined,
                .interface = .{
                    .vtable = &.{
                        .drain = wasmDrain,
                        .flush = Io.Writer.noopFlush,
                        .rebase = Io.Writer.failingRebase,
                    },
                    .buffer = &.{},
                },
            };
        } else {
            ensureThreaded();
            const io = threaded.io();
            writer = std.Io.File.writerStreaming(std.Io.File.stdout(), io, &writeBuf);
        }
    }
    if (!readerInit) {
        readerInit = true;
        if (comptime !is_wasm) {
            ensureThreaded();
            const io = threaded.io();
            reader = std.Io.File.readerStreaming(std.Io.File.stdin(), io, &readBuf);
        }
    }
}

fn wasmDrain(w: *Io.Writer, data: []const []const u8, splat: usize) Io.Writer.Error!usize {
    _ = w;
    if (splat == 0) {
        var total: usize = 0;
        for (data) |slice| {
            wasm_output_buf.appendSlice(wasm_alloc, slice) catch return error.WriteFailed;
            total += slice.len;
        }
        return total;
    }
    var total: usize = 0;
    for (data[0 .. data.len - 1]) |slice| {
        wasm_output_buf.appendSlice(wasm_alloc, slice) catch return error.WriteFailed;
        total += slice.len;
    }
    const last = data[data.len - 1];
    for (0..splat) |_| {
        wasm_output_buf.appendSlice(wasm_alloc, last) catch return error.WriteFailed;
        total += last.len;
    }
    return total;
}

pub fn resetOutput() void {
    wasm_output_buf.clearRetainingCapacity();
}

pub fn getOutputPtr() [*]const u8 {
    return wasm_output_buf.items.ptr;
}

pub fn getOutputLen() usize {
    return wasm_output_buf.items.len;
}

pub fn flushAll() void {
    if (comptime is_wasm) {
        return;
    }
    if (writerInit) {
        writer.interface.flush() catch unreachable;
    }
}
