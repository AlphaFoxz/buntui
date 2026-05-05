const std = @import("std");
const TuiScale = @import("../core/typedef.zig").TuiScale;
const logger = @import("../core/logger.zig");

pub const MAX_CLIP_DEPTH: usize = 32;

pub const ClipRect = extern struct {
    x: TuiScale,
    y: TuiScale,
    width: TuiScale,
    height: TuiScale,

    pub fn intersect(a: ClipRect, b: ClipRect) ClipRect {
        const x1 = @max(a.x, b.x);
        const y1 = @max(a.y, b.y);
        const x2: TuiScale = @min(a.x + a.width, b.x + b.width);
        const y2: TuiScale = @min(a.y + a.height, b.y + b.height);
        if (x2 <= x1 or y2 <= y1) {
            return .{ .x = 0, .y = 0, .width = 0, .height = 0 };
        }
        return .{ .x = x1, .y = y1, .width = x2 - x1, .height = y2 - y1 };
    }

    pub fn isEmpty(self: ClipRect) bool {
        return self.width == 0 or self.height == 0;
    }

    pub fn contains(self: ClipRect, px: TuiScale, py: TuiScale) bool {
        return px >= self.x and px < self.x + self.width and
            py >= self.y and py < self.y + self.height;
    }
};

pub const ClipStack = struct {
    rects: [MAX_CLIP_DEPTH]ClipRect,
    top: usize,
    screen: ClipRect,

    pub fn init(screen_width: TuiScale, screen_height: TuiScale) ClipStack {
        return .{
            .rects = undefined,
            .top = 0,
            .screen = .{ .x = 0, .y = 0, .width = screen_width, .height = screen_height },
        };
    }

    pub fn current(self: *const ClipStack) ClipRect {
        if (self.top == 0) return self.screen;
        return self.rects[self.top - 1];
    }

    pub fn push(self: *ClipStack, rect: ClipRect) bool {
        if (self.top >= MAX_CLIP_DEPTH) {
            logger.logWarning("ClipStack overflow: exceeded max depth of 32");
            return false;
        }
        const clipped = if (self.top == 0)
            self.screen.intersect(rect)
        else
            self.rects[self.top - 1].intersect(rect);
        self.rects[self.top] = clipped;
        self.top += 1;
        return true;
    }

    pub fn pop(self: *ClipStack) void {
        if (self.top > 0) {
            self.top -= 1;
        }
    }

    pub fn reset(self: *ClipStack, screen_width: TuiScale, screen_height: TuiScale) void {
        self.top = 0;
        self.screen = .{ .x = 0, .y = 0, .width = screen_width, .height = screen_height };
    }
};

// ============ Tests ============

test "ClipRect intersect full overlap" {
    const a = ClipRect{ .x = 0, .y = 0, .width = 10, .height = 10 };
    const b = ClipRect{ .x = 2, .y = 2, .width = 5, .height = 5 };
    const result = a.intersect(b);
    try std.testing.expectEqual(ClipRect{ .x = 2, .y = 2, .width = 5, .height = 5 }, result);
}

test "ClipRect intersect partial overlap" {
    const a = ClipRect{ .x = 0, .y = 0, .width = 10, .height = 10 };
    const b = ClipRect{ .x = 5, .y = 5, .width = 10, .height = 10 };
    const result = a.intersect(b);
    try std.testing.expectEqual(ClipRect{ .x = 5, .y = 5, .width = 5, .height = 5 }, result);
}

test "ClipRect intersect no overlap returns empty" {
    const a = ClipRect{ .x = 0, .y = 0, .width = 5, .height = 5 };
    const b = ClipRect{ .x = 10, .y = 10, .width = 5, .height = 5 };
    const result = a.intersect(b);
    try std.testing.expect(result.isEmpty());
}

test "ClipRect intersect touching edge returns empty" {
    const a = ClipRect{ .x = 0, .y = 0, .width = 5, .height = 5 };
    const b = ClipRect{ .x = 5, .y = 0, .width = 5, .height = 5 };
    const result = a.intersect(b);
    try std.testing.expect(result.isEmpty());
}

test "ClipRect intersect same rect returns same" {
    const r = ClipRect{ .x = 3, .y = 7, .width = 20, .height = 15 };
    const result = r.intersect(r);
    try std.testing.expectEqual(r, result);
}

test "ClipRect isEmpty zero width" {
    const r = ClipRect{ .x = 0, .y = 0, .width = 0, .height = 10 };
    try std.testing.expect(r.isEmpty());
}

test "ClipRect isEmpty zero height" {
    const r = ClipRect{ .x = 0, .y = 0, .width = 10, .height = 0 };
    try std.testing.expect(r.isEmpty());
}

test "ClipRect isEmpty valid rect" {
    const r = ClipRect{ .x = 0, .y = 0, .width = 1, .height = 1 };
    try std.testing.expect(!r.isEmpty());
}

test "ClipRect contains interior point" {
    const r = ClipRect{ .x = 5, .y = 5, .width = 10, .height = 8 };
    try std.testing.expect(r.contains(10, 10));
}

test "ClipRect contains top-left corner" {
    const r = ClipRect{ .x = 5, .y = 5, .width = 10, .height = 8 };
    try std.testing.expect(r.contains(5, 5));
}

test "ClipRect contains excludes right edge" {
    const r = ClipRect{ .x = 5, .y = 5, .width = 10, .height = 8 };
    try std.testing.expect(!r.contains(15, 5));
}

test "ClipRect contains excludes bottom edge" {
    const r = ClipRect{ .x = 5, .y = 5, .width = 10, .height = 8 };
    try std.testing.expect(!r.contains(5, 13));
}

test "ClipRect contains point outside" {
    const r = ClipRect{ .x = 5, .y = 5, .width = 10, .height = 8 };
    try std.testing.expect(!r.contains(0, 0));
    try std.testing.expect(!r.contains(20, 20));
}

test "ClipStack init and current returns screen" {
    var stack = ClipStack.init(80, 24);
    try std.testing.expectEqual(ClipRect{ .x = 0, .y = 0, .width = 80, .height = 24 }, stack.current());
    try std.testing.expectEqual(@as(usize, 0), stack.top);
}

test "ClipStack push and current" {
    var stack = ClipStack.init(80, 24);
    const pushed = stack.push(.{ .x = 10, .y = 5, .width = 30, .height = 10 });
    try std.testing.expect(pushed);
    try std.testing.expectEqual(@as(usize, 1), stack.top);
    try std.testing.expectEqual(ClipRect{ .x = 10, .y = 5, .width = 30, .height = 10 }, stack.current());
}

test "ClipStack push intersects with current" {
    var stack = ClipStack.init(80, 24);
    _ = stack.push(.{ .x = 10, .y = 5, .width = 30, .height = 10 });
    _ = stack.push(.{ .x = 20, .y = 0, .width = 30, .height = 20 });
    // Second push intersects with first clip
    try std.testing.expectEqual(ClipRect{ .x = 20, .y = 5, .width = 20, .height = 10 }, stack.current());
}

test "ClipStack pop" {
    var stack = ClipStack.init(80, 24);
    _ = stack.push(.{ .x = 10, .y = 5, .width = 30, .height = 10 });
    stack.pop();
    try std.testing.expectEqual(@as(usize, 0), stack.top);
    try std.testing.expectEqual(ClipRect{ .x = 0, .y = 0, .width = 80, .height = 24 }, stack.current());
}

test "ClipStack pop when empty does nothing" {
    var stack = ClipStack.init(80, 24);
    stack.pop();
    stack.pop();
    try std.testing.expectEqual(@as(usize, 0), stack.top);
}

test "ClipStack reset" {
    var stack = ClipStack.init(80, 24);
    _ = stack.push(.{ .x = 10, .y = 5, .width = 30, .height = 10 });
    _ = stack.push(.{ .x = 20, .y = 0, .width = 10, .height = 5 });
    stack.reset(120, 40);
    try std.testing.expectEqual(@as(usize, 0), stack.top);
    try std.testing.expectEqual(ClipRect{ .x = 0, .y = 0, .width = 120, .height = 40 }, stack.current());
}

test "ClipStack push overflow at max depth" {
    var stack = ClipStack.init(80, 24);
    var i: usize = 0;
    while (i < MAX_CLIP_DEPTH) : (i += 1) {
        const ok = stack.push(.{ .x = 0, .y = 0, .width = 1, .height = 1 });
        try std.testing.expect(ok);
    }
    // 33rd push should fail
    const overflow = stack.push(.{ .x = 0, .y = 0, .width = 1, .height = 1 });
    try std.testing.expect(!overflow);
}

test "ClipStack push outside screen returns empty clip" {
    var stack = ClipStack.init(80, 24);
    const ok = stack.push(.{ .x = 100, .y = 100, .width = 10, .height = 10 });
    try std.testing.expect(ok);
    try std.testing.expect(stack.current().isEmpty());
}
