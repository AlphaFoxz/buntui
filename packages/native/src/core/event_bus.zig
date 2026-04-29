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

    fn commit_read(self: *EventBus) void {
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
    global_bus.commit_read();
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
