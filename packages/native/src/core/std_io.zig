const std = @import("std");

var writeBuf: [35 * 90]u8 = undefined;
pub var writer: std.Io.File.Writer = undefined;
var writerInit: bool = false;

var readBuf: [35 * 90]u8 = undefined;
pub var reader: std.Io.File.Reader = undefined;
var readerInit: bool = false;

var threaded: std.Io.Threaded = undefined;

pub fn init() void {
    if (!writerInit) {
        writerInit = true;
        if (!readerInit) {
            threaded = std.Io.Threaded.init(
                std.heap.c_allocator,
                .{
                    .stack_size = 1024 * 1024,
                    .argv0 = undefined,
                },
            );
            readerInit = true;
        }
        const io = threaded.io();
        writer = std.Io.File.writerStreaming(std.Io.File.stdout(), io, &writeBuf);
    }
    if (!readerInit) {
        readerInit = true;
        if (!writerInit) {
            threaded = std.Io.Threaded.init(
                std.heap.c_allocator,
                .{
                    .stack_size = 1024 * 1024,
                    .argv0 = undefined,
                },
            );
            writerInit = true;
        }
        const io = threaded.io();
        reader = std.Io.File.readerStreaming(std.Io.File.stdin(), io, &readBuf);
    }
}

pub fn flushAll() void {
    if (writerInit) {
        writer.interface.flush() catch unreachable;
    }
}
