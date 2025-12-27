const std = @import("std");
const err = @import("./error.zig");
const logger = @import("./logger.zig");
// const gpa = std.heap.GeneralPurposeAllocator(.{}){};
const glo_alloc = @import("./glo_alloc.zig");

pub const Utf8Iterator = struct {
    bytes: []const u8,
    index: usize,

    pub fn next(self: *Utf8Iterator) ?[]const u8 {
        if (self.index >= self.bytes.len) return null;

        const start = self.index;
        const len = std.unicode.utf8ByteSequenceLength(self.bytes[start]) catch 1;

        if (start + len > self.bytes.len) {
            self.index = self.bytes.len;
            return null;
        }

        self.index += len;
        return self.bytes[start..self.index];
    }

    pub fn preview(self: *Utf8Iterator) ?[]const u8 {
        if (self.index >= self.bytes.len) return null;

        const start = self.index;
        const len = std.unicode.utf8ByteSequenceLength(self.bytes[start]) catch 1;

        if (start + len > self.bytes.len) {
            self.index = self.bytes.len;
            return null;
        }
        return self.bytes[start .. self.index + len];
    }

    pub fn reset(self: *Utf8Iterator) void {
        self.index = 0;
    }
};

pub const String = struct {
    buffer: std.ArrayList(u8),
    alloc: std.mem.Allocator,

    pub fn init() *String {
        const alloc = glo_alloc.allocator();
        const self = alloc.create(String) catch {
            err.outOfMemory();
        };
        self.* = String{
            .alloc = alloc,
            .buffer = std.ArrayList(u8).initCapacity(alloc, 0) catch {
                err.outOfMemory();
            },
        };
        return self;
    }

    pub fn deinit(self: *String) void {
        defer self.alloc.destroy(self);
        self.buffer.deinit(self.alloc);
    }

    pub fn initFromSclice(slice: []const u8) *String {
        const alloc = glo_alloc.allocator();
        const self = alloc.create(String) catch {
            err.outOfMemory();
        };
        const buffer = std.ArrayList(u8).initCapacity(alloc, slice.len) catch {
            err.outOfMemory();
        };
        self.* = String{
            .alloc = alloc,
            .buffer = buffer,
        };
        self.*.append(slice);
        return self;
    }

    pub fn initFromCSclice(slice: [*:0]const u8) *String {
        const alloc = glo_alloc.allocator();
        const self = alloc.create(String) catch {
            err.outOfMemory();
        };

        const s = std.mem.span(slice);

        var buffer = std.ArrayList(u8).initCapacity(alloc, s.len) catch {
            err.outOfMemory();
        };
        buffer.appendSlice(alloc, s) catch {
            err.outOfMemory();
        };
        self.* = String{
            .alloc = alloc,
            .buffer = buffer,
        };
        return self;
    }

    pub fn append(self: *String, slice: []const u8) void {
        self.buffer.appendSlice(self.alloc, slice) catch {
            err.outOfMemory();
        };
    }

    pub fn set(self: *String, slice: []const u8) void {
        self.buffer.clearRetainingCapacity();
        self.buffer.appendSlice(self.alloc, slice) catch {
            err.outOfMemory();
        };
    }

    pub fn clear(self: *String) void {
        self.buffer.clearRetainingCapacity();
    }

    pub fn iter(self: *String) Utf8Iterator {
        return Utf8Iterator{
            .bytes = self.buffer.items,
            .index = 0,
        };
    }
    pub fn toSlice(self: *String) []u8 {
        return self.buffer.items;
    }
};

pub fn getDisplayWidthStd(s: []const u8) usize {
    var width: usize = 0;
    const view = std.unicode.Utf8View.init(s) catch return s.len;
    var iter = view.iterator();
    while (iter.nextCodepoint()) |codepoint| {
        width += unicodeWidth(codepoint);
    }
    return width;
}

// Unicode 字符宽度判断
fn unicodeWidth(codepoint: u21) usize {
    // 简化版本，实际应该使用 East Asian Width 数据
    if (codepoint < 0x80) return 1; // ASCII
    if (codepoint >= 0x4E00 and codepoint <= 0x9FFF) return 2; // CJK统一汉字
    if (codepoint >= 0x3000 and codepoint <= 0x303F) return 2; // CJK符号
    if (codepoint >= 0xFF00 and codepoint <= 0xFFEF) return 2; // 全角字符
    if (codepoint >= 0xAC00 and codepoint <= 0xD7AF) return 2; // 韩文
    return 1; // 默认
}

pub const SPECIAL_CHARS = struct {
    pub const resize = "⊿";
    pub const minimal = "―";
    pub const normalize = "=";
    pub const maximize = "○";
    pub const close = "×";

    pub const minimal_l = "↓";
    pub const normalize_l = "△";
    pub const maximize_l = "↑";
    pub const close_l = "✖";
};
