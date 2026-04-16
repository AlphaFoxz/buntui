const std = @import("std");
const Bool = @import("./typedef.zig").Bool;

pub const LOG_LEVEL = u8;
pub const LOG_LEVEL_DEBUG: u8 = 0;
pub const LOG_LEVEL_INFO: u8 = 1;
pub const LOG_LEVEL_WARNING: u8 = 2;
pub const LOG_LEVEL_ERROR: u8 = 3;

pub var current_log_level: LOG_LEVEL = LOG_LEVEL_INFO;
var log_dir_path: []const u8 = undefined;
var log_path_initialized: bool = false;

var log_threaded: std.Io.Threaded = undefined;
var log_dir: std.Io.Dir = undefined;
var log_file: std.Io.File = undefined;
const buf_size = 256;
var log_buf: [buf_size]u8 = undefined;
var writer: std.Io.File.Writer = undefined;

const flush_on_error = true;
const flush_on_warning = true;

pub fn load(dir_path: []const u8, log_name: []const u8, lvl: LOG_LEVEL, clear_log: Bool) void {
    switch (current_log_level) {
        0...4 => {
            current_log_level = lvl;
        },
        else => {
            std.log.err("Out of memory", .{});
            std.process.exit(1);
        },
    }
    if (log_path_initialized) {
        return;
    }
    log_dir_path = dir_path;

    // Initialize Io instance
    log_threaded = std.Io.Threaded.init(
        std.heap.c_allocator,
        .{
            .stack_size = 1024 * 1024,
            .argv0 = undefined,
        },
    );
    const io = log_threaded.io();

    // std.fs.makeDirAbsolute(log_dir_path) catch unreachable;
    log_dir = std.Io.Dir.openDirAbsolute(io, log_dir_path, .{}) catch {
        ioError();
    };
    log_file = std.Io.Dir.createFile(log_dir, io, log_name, .{
        .truncate = false,
        // .lock = .exclusive,
    }) catch {
        ioError();
    };
    if (clear_log != .False) {
        var clear_writer = std.Io.File.writer(log_file, io, &[0]u8{});
        _ = clear_writer.interface.writeVec(&.{""}) catch {
            ioError();
        };
    }

    // Note: File operations automatically append at the end for our use case
    @memset(&log_buf, 0);
    writer = std.Io.File.writerStreaming(log_file, io, &log_buf);
    log_path_initialized = true;
}

pub fn unload() void {
    if (!log_path_initialized) {
        return;
    }
    writer.flush() catch {
        ioError();
    };
    const io = log_threaded.io();
    std.Io.File.close(log_file, io);
    std.Io.Dir.close(log_dir, io);
    log_path_initialized = false;
}

var last_timestamp_ms: i64 = 0;
const TIMESTAMP_CACHE_MS = 100; // 时间戳缓存100ms
var cached_timestamp_len: usize = 0;
var cached_timestamp: [32]u8 = undefined;

inline fn currentTimstampStr() []const u8 {
    const io = log_threaded.io();
    const now_ts = std.Io.Timestamp.now(io, .real);
    const now_ms = @as(i64, @intCast(@divTrunc(now_ts.nanoseconds, 1_000_000)));

    // 如果时间戳缓存仍然有效，直接返回
    if (now_ms - last_timestamp_ms < TIMESTAMP_CACHE_MS and cached_timestamp_len > 0) {
        return cached_timestamp[0..cached_timestamp_len];
    }

    var buf: [32]u8 = undefined;
    const epoch_seconds = @as(u64, @intCast(@divTrunc(now_ts.nanoseconds, 1_000_000_000)));
    const epoch_day = std.time.epoch.EpochSeconds{ .secs = epoch_seconds };
    const ds = epoch_day.getDaySeconds();
    const yd = epoch_day.getEpochDay().calculateYearDay();
    const md = yd.calculateMonthDay();
    const year = yd.year;
    const mon = md.month.numeric();
    const day = md.day_index + 1;
    const h = ds.getHoursIntoDay();
    const m = ds.getMinutesIntoHour();
    const s = ds.getSecondsIntoMinute();
    const out = std.fmt.bufPrint(
        &buf,
        "[{d:0>4}-{d:0>2}-{d:0>2} {d:0>2}:{d:0>2}:{d:0>2}]",
        .{ year, mon, day, h, m, s },
    ) catch
        return "TIMESTAMP_ERR";

    last_timestamp_ms = now_ms;
    cached_timestamp_len = out.len;
    std.mem.copyForwards(u8, &cached_timestamp, out);
    return out;
}

fn write(msg: []const u8, need_flush: bool) void {
    if (!log_path_initialized) {
        return;
    }
    _ = writer.interface.writeVec(&.{msg}) catch ioError();
    if (need_flush) {
        writer.flush() catch ioError();
    }
}

pub fn logDebug(msg: []const u8) void {
    if (current_log_level > LOG_LEVEL_DEBUG) {
        return;
    }
    const alloc = std.heap.c_allocator;
    const timestamp = currentTimstampStr();
    const str = std.fmt.allocPrint(alloc, "{s} debug: {s}\n", .{ timestamp, msg }) catch outOfMemory();
    defer alloc.free(str);
    write(str, false);
}

pub fn logDebugFmt(comptime fmt: []const u8, args: anytype) void {
    if (current_log_level > LOG_LEVEL_DEBUG) {
        return;
    }
    const alloc = std.heap.c_allocator;
    const timestamp = currentTimstampStr();
    const str = std.fmt.allocPrint(
        alloc,
        "{s} debug: " ++ fmt ++ "\n",
        .{timestamp} ++ args,
    ) catch outOfMemory();
    defer alloc.free(str);
    write(str, false);
}

pub fn logInfo(msg: []const u8) void {
    if (current_log_level > LOG_LEVEL_INFO) {
        return;
    }
    const alloc = std.heap.c_allocator;
    const timestamp = currentTimstampStr();
    const str = std.fmt.allocPrint(alloc, "{s} info: {s}\n", .{ timestamp, msg }) catch outOfMemory();
    defer alloc.free(str);
    write(str, false);
}

pub fn logInfoFmt(comptime fmt: []const u8, args: anytype) void {
    if (current_log_level > LOG_LEVEL_INFO) {
        return;
    }
    const alloc = std.heap.c_allocator;
    const timestamp = currentTimstampStr();
    const str = std.fmt.allocPrint(
        alloc,
        "{s} info: " ++ fmt ++ "\n",
        .{timestamp} ++ args,
    ) catch outOfMemory();
    defer alloc.free(str);
    write(str, false);
}

pub fn logWarning(msg: []const u8) void {
    if (current_log_level > LOG_LEVEL_WARNING) {
        return;
    }
    const alloc = std.heap.c_allocator;
    const timestamp = currentTimstampStr();
    const str = std.fmt.allocPrint(alloc, "{s} warning: {s}\n", .{ timestamp, msg }) catch outOfMemory();
    defer alloc.free(str);
    write(str, flush_on_warning);
}

pub fn logWarningFmt(comptime fmt: []const u8, args: anytype) void {
    if (current_log_level > LOG_LEVEL_WARNING) {
        return;
    }
    const alloc = std.heap.c_allocator;
    const timestamp = currentTimstampStr();
    const str = std.fmt.allocPrint(
        alloc,
        "{s} warning: " ++ fmt ++ "\n",
        .{timestamp} ++ args,
    ) catch outOfMemory();
    defer alloc.free(str);
    write(str, flush_on_warning);
}

pub fn logError(msg: []const u8) void {
    if (current_log_level > LOG_LEVEL_ERROR) {
        return;
    }
    const alloc = std.heap.c_allocator;
    const timestamp = currentTimstampStr();
    const str = std.fmt.allocPrint(alloc, "{s} error: {s}\n", .{ timestamp, msg }) catch outOfMemory();
    defer alloc.free(str);
    write(str, flush_on_error);
}

pub fn logErrorFmt(comptime fmt: []const u8, args: anytype) void {
    if (current_log_level > LOG_LEVEL_ERROR) {
        return;
    }
    const alloc = std.heap.c_allocator;
    const timestamp = currentTimstampStr();
    const str = std.fmt.allocPrint(
        alloc,
        "{s} error: " ++ fmt ++ "\n",
        .{timestamp} ++ args,
    ) catch outOfMemory();
    defer alloc.free(str);
    write(str, flush_on_error);
}

pub fn flush() void {
    if (!log_path_initialized) {
        return;
    }
    writer.interface.flush() catch ioError();
}

fn ioError() noreturn {
    std.log.err("IO error", .{});
    std.process.exit(1);
}

fn outOfMemory() noreturn {
    std.log.err("Out of memory", .{});
    std.process.exit(1);
}
