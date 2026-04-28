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
