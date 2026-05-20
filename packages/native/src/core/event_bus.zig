const std = @import("std");

// ============ 配置 ============
const SLOT_SIZE = 256; // 每个事件槽大小
const QUEUE_SIZE = 1024; // 环形队列容量（必须是2的幂）
const QUEUE_MASK = QUEUE_SIZE - 1;

// ============ 事件头部 ============
const EventHeader = extern struct {
    event_type: u32, // 事件类型ID
    payload_len: u32, // 实际负载长度
    sequence: u64, // 序列号（可选，用于检测丢失）
};

// ============ 事件槽 ============
pub const EventSlot = extern struct {
    header: EventHeader,
    data: [SLOT_SIZE - @sizeOf(EventHeader)]u8,
};

pub const EventType = enum(u16) {
    KeyboardEvent = 1,
    MouseEvent = 2,
    WheelEvent = 3,
    TermResizeEvent = 4,
};

// ============ SPSC 无锁环形队列 ============
const EventBus = struct {
    slots: [QUEUE_SIZE]EventSlot align(64),
    head: std.atomic.Value(u64) align(64), // 写入位置（生产者独占）
    tail: std.atomic.Value(u64) align(64), // 读取位置（消费者独占）
    sequence: u64,

    fn init() EventBus {
        return .{
            .slots = undefined,
            .head = std.atomic.Value(u64).init(0),
            .tail = std.atomic.Value(u64).init(0),
            .sequence = 0,
        };
    }

    fn emit(self: *EventBus, event_type: u16, data: []const u8) !void {
        if (data.len > SLOT_SIZE - @sizeOf(EventHeader)) {
            return error.EventTooLarge;
        }

        const head = self.head.load(.monotonic);
        var tail = self.tail.load(.acquire);

        // 等待空位
        while (head - tail >= QUEUE_SIZE) {
            std.atomic.spinLoopHint();
            tail = self.tail.load(.acquire);
        }

        const idx = head & QUEUE_MASK;
        self.slots[idx].header = .{
            .event_type = event_type,
            .payload_len = @intCast(data.len),
            .sequence = self.sequence,
        };
        @memcpy(self.slots[idx].data[0..data.len], data);

        self.sequence += 1;

        // 发布（Release语义确保消费者能看到完整数据）
        self.head.store(head + 1, .release);
    }

    fn poll(self: *EventBus) ?*const EventSlot {
        const tail = self.tail.load(.monotonic);
        const head = self.head.load(.acquire);

        if (tail >= head) return null;

        const idx = tail & QUEUE_MASK;
        return &self.slots[idx];
    }

    fn commitRead(self: *EventBus) void {
        const tail = self.tail.load(.monotonic);
        self.tail.store(tail + 1, .release);
    }
};

// ============ 全局实例 ============
var global_bus: EventBus = undefined;
var initialized: bool = false;

// ============ FFI 导出函数 ============
pub fn event_bus_setup() void {
    if (!initialized) {
        global_bus = EventBus.init();
        initialized = true;
    }
}

// 发布事件：event_type, data指针, 长度
pub fn event_bus_emit(event_type: u16, data_ptr: [*]const u8, len: usize) c_int {
    if (!initialized) return -1;

    const data = data_ptr[0..len];
    global_bus.emit(event_type, data) catch return -2;
    return 0;
}

pub fn event_bus_emit_bytes(event_type: u16, data: []const u8) c_int {
    if (!initialized) return -1;
    global_bus.emit(event_type, data) catch return -2;
    return 0;
}

// 轮询事件（返回槽位指针，NULL表示无事件）
pub fn event_bus_poll() ?*const EventSlot {
    if (!initialized) return null;
    return global_bus.poll();
}

// 确认读取
pub fn event_bus_commit() void {
    if (!initialized) return;
    global_bus.commitRead();
}

// 获取队列统计
pub fn event_bus_stats(out_pending: *u64) void {
    if (!initialized) {
        out_pending.* = 0;
        return;
    }
    const head = global_bus.head.load(.monotonic);
    const tail = global_bus.tail.load(.monotonic);
    out_pending.* = head - tail;
}

// ============ Tests ============

test "EventBus init has zero head and tail" {
    var bus = EventBus.init();
    try std.testing.expectEqual(@as(u64, 0), bus.head.load(.monotonic));
    try std.testing.expectEqual(@as(u64, 0), bus.tail.load(.monotonic));
    try std.testing.expectEqual(@as(u64, 0), bus.sequence);
}

test "EventBus emit then poll returns event" {
    var bus = EventBus.init();
    const data = "hello";
    try bus.emit(1, data);

    const slot = bus.poll();
    try std.testing.expect(slot != null);
    try std.testing.expectEqual(@as(u32, 1), slot.?.header.event_type);
    try std.testing.expectEqual(@as(u32, 5), slot.?.header.payload_len);
    try std.testing.expectEqualStrings("hello", slot.?.data[0..5]);
}

test "EventBus poll returns null when empty" {
    var bus = EventBus.init();
    const slot = bus.poll();
    try std.testing.expect(slot == null);
}

test "EventBus commit_read advances tail" {
    var bus = EventBus.init();
    try bus.emit(1, "a");
    _ = bus.poll();
    bus.commitRead();
    // After commit, poll should return null (no more events)
    const slot = bus.poll();
    try std.testing.expect(slot == null);
}

test "EventBus FIFO order" {
    var bus = EventBus.init();
    try bus.emit(1, "first");
    try bus.emit(2, "sec");

    const s1 = bus.poll();
    try std.testing.expect(s1 != null);
    try std.testing.expectEqual(@as(u32, 1), s1.?.header.event_type);
    try std.testing.expectEqualStrings("first", s1.?.data[0..5]);

    bus.commitRead();

    const s2 = bus.poll();
    try std.testing.expect(s2 != null);
    try std.testing.expectEqual(@as(u32, 2), s2.?.header.event_type);
    try std.testing.expectEqualStrings("sec", s2.?.data[0..3]);

    bus.commitRead();
}

test "EventBus sequence increments per emit" {
    var bus = EventBus.init();
    try bus.emit(1, "a");
    try bus.emit(2, "b");

    const s1 = bus.poll();
    try std.testing.expectEqual(@as(u64, 0), s1.?.header.sequence);

    bus.commitRead();

    const s2 = bus.poll();
    try std.testing.expectEqual(@as(u64, 1), s2.?.header.sequence);

    bus.commitRead();
}

test "EventBus reject oversized payload" {
    var bus = EventBus.init();
    const big_data = [_]u8{0} ** (SLOT_SIZE - @sizeOf(EventHeader) + 1);
    const result = bus.emit(1, &big_data);
    try std.testing.expectError(error.EventTooLarge, result);
}

test "EventBus emit at max payload size succeeds" {
    var bus = EventBus.init();
    const max_data = [_]u8{0xAB} ** (SLOT_SIZE - @sizeOf(EventHeader));
    try bus.emit(1, &max_data);

    const slot = bus.poll();
    try std.testing.expect(slot != null);
    try std.testing.expectEqual(@as(u32, SLOT_SIZE - @sizeOf(EventHeader)), slot.?.header.payload_len);
    try std.testing.expectEqual(@as(u8, 0xAB), slot.?.data[0]);
}

test "EventBus EventType enum values match TS TuiEventType" {
    try std.testing.expectEqual(@as(u16, 1), @intFromEnum(EventType.KeyboardEvent));
    try std.testing.expectEqual(@as(u16, 2), @intFromEnum(EventType.MouseEvent));
    try std.testing.expectEqual(@as(u16, 3), @intFromEnum(EventType.WheelEvent));
    try std.testing.expectEqual(@as(u16, 4), @intFromEnum(EventType.TermResizeEvent));
}

test "EventSlot header size is 16 bytes" {
    try std.testing.expectEqual(@as(usize, 16), @sizeOf(EventHeader));
}

test "EventSlot total size is 256 bytes" {
    try std.testing.expectEqual(@as(usize, 256), @sizeOf(EventSlot));
}

test "event_bus_setup initializes global bus" {
    // Reset state first
    initialized = false;
    event_bus_setup();
    try std.testing.expect(initialized);

    // Second setup is idempotent
    event_bus_setup();
    try std.testing.expect(initialized);
}

test "event_bus_emit returns -1 when not initialized" {
    initialized = false;
    const result = event_bus_emit(1, "x", 1);
    try std.testing.expectEqual(@as(c_int, -1), result);
}

test "event_bus_poll returns null when not initialized" {
    initialized = false;
    const result = event_bus_poll();
    try std.testing.expect(result == null);
}

test "event_bus_commit is no-op when not initialized" {
    initialized = false;
    event_bus_commit();
    // Should not crash
}

test "event_bus_stats returns 0 when not initialized" {
    initialized = false;
    var pending: u64 = 999;
    event_bus_stats(&pending);
    try std.testing.expectEqual(@as(u64, 0), pending);
}

test "event_bus full FFI round-trip" {
    event_bus_setup();

    const data = "test";
    const rc = event_bus_emit_bytes(2, data);
    try std.testing.expectEqual(@as(c_int, 0), rc);

    const slot = event_bus_poll();
    try std.testing.expect(slot != null);
    try std.testing.expectEqual(@as(u32, 2), slot.?.header.event_type);
    try std.testing.expectEqualStrings("test", slot.?.data[0..4]);

    event_bus_commit();

    var pending: u64 = 99;
    event_bus_stats(&pending);
    try std.testing.expectEqual(@as(u64, 0), pending);
}
