const std = @import("std");
const builtin = @import("builtin");
const logger = @import("../core/logger.zig");
const windows = std.os.windows;
const mode = @import("./windows_mode.zig");
const event_bus = @import("../core/event_bus.zig");
const mapper = @import("./windows_mapper.zig");

comptime {
    if (builtin.os.tag != .windows) {
        @compileError("Unsupported OS: Not Windows");
    }
}

var thread: std.Thread = undefined;
var thread_started: bool = false;
var should_stop = std.atomic.Value(bool).init(false);

pub fn start() void {
    if (!thread_started) {
        thread = std.Thread.spawn(.{}, listen, .{}) catch |e| {
            logger.logErrorFmt("Failed to start mouse event listener: {}", .{e});
            return;
        };
        thread_started = true;
    }
}

pub fn stop() void {
    if (thread_started) {
        should_stop.store(true, .release);
        thread.join();
        thread_started = false;
    }
}

// =================== Windows Impl ===================
pub const KEY_EVENT_RECORD = extern struct {
    bKeyDown: windows.BOOL,
    wRepeatCount: u16,
    wVirtualKeyCode: u16,
    wVirtualScanCode: u16,
    uChar: extern union {
        UnicodeChar: u16,
        AsciiChar: windows.CHAR,
    },
    dwControlKeyState: u32,
};
pub const MOUSE_EVENT_RECORD = extern struct {
    dwMousePosition: windows.COORD,
    dwButtonState: u32,
    dwControlKeyState: u32,
    dwEventFlags: u32,
};
pub const WINDOW_BUFFER_SIZE_RECORD = extern struct {
    dwSize: windows.COORD,
};
pub const MENU_EVENT_RECORD = extern struct {
    dwCommandId: u32,
};

pub const FOCUS_EVENT_RECORD = extern struct {
    bSetFocus: windows.BOOL,
};
pub const INPUT_RECORD = extern struct {
    EventType: u16,
    Event: extern union {
        KeyEvent: KEY_EVENT_RECORD,
        MouseEvent: MOUSE_EVENT_RECORD,
        WindowBufferSizeEvent: WINDOW_BUFFER_SIZE_RECORD,
        MenuEvent: MENU_EVENT_RECORD,
        FocusEvent: FOCUS_EVENT_RECORD,
    },
};

extern "kernel32" fn GetStdHandle(nStdHandle: u32) callconv(.winapi) ?windows.HANDLE;

pub extern "kernel32" fn ReadConsoleInputW(
    hConsoleInput: ?windows.HANDLE,
    lpBuffer: [*]INPUT_RECORD,
    nLength: u32,
    lpNumberOfEventsRead: ?*u32,
) callconv(.winapi) windows.BOOL;

pub extern "kernel32" fn WaitForSingleObject(
    hHandle: ?windows.HANDLE,
    dwMilliseconds: u32,
) callconv(.winapi) u32;

// 鼠标按钮状态
const FROM_LEFT_1ST_BUTTON_PRESSED = 0x0001;
const RIGHTMOST_BUTTON_PRESSED = 0x0002;
const FROM_LEFT_2ND_BUTTON_PRESSED = 0x0004;

// 鼠标事件标志
const MOUSE_MOVED = 0x0001;
const DOUBLE_CLICK = 0x0002;
const MOUSE_WHEELED = 0x0004;
// const MOUSE_HWHEELED = 0x0008;

const RIGHT_ALT_PRESSED = 0x0001;
const LEFT_ALT_PRESSED = 0x0002;
const RIGHT_CTRL_PRESSED = 0x0004;
const LEFT_CTRL_PRESSED = 0x0008;
const SHIFT_PRESSED = 0x0010;

// 定义简单的状态机状态
const InputState = enum {
    Normal,
    EscReceived, // 收到了 \x1b
    CsiReceived, // 收到了 [
    Ss3Received,
    // 实际的 parser 可能会更复杂，这里简化演示
};

// See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
const keyboard_event_fmt =
    \\{{"key":{s},"shiftKey":{},"altKey":{},"ctrlKey":{},"metaKey":{},"repeat":{},"charCode":{d}}}
;
const keyboard_event_fmt_uni =
    \\{{"key":"{u}","shiftKey":{},"altKey":{},"ctrlKey":{},"metaKey":{},"repeat":{},"charCode":{d}}}
;
const keyboard_event_fmt_vir =
    \\{{"key":"{s}","shiftKey":{},"altKey":{},"ctrlKey":{},"metaKey":{},"repeat":{},"charCode":{d}}}
;
// See https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
const mouse_event_fmt =
    \\{{"button":{s},"buttons":{s},"x":{d},"y":{d},"shiftKey":{},"altKey":{},"ctrlKey":{},"metaKey":{}}}
;
// See https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent
const wheel_event_fmt =
    \\{{"button":{s},"buttons":{s},"x":{d},"y":{d},"shiftKey":{},"altKey":{},"ctrlKey":{},"metaKey":{},"wheelDeltaY":{d}}}
;
var event_buf: [256]u8 = undefined;
const IS_UNICODE_KEY: u8 = 0x0001;
const IS_VIRTUAL_KEY: u8 = 0x0002;

inline fn keyboardEventJson(comptime flag: u8, attrs: struct { key: []const u8, is_shift: bool, is_alt: bool, is_ctrl: bool, is_meta: bool, is_repeat: bool, char_code: u16 }) []const u8 {
    const is_unicode = flag & IS_UNICODE_KEY != 0;
    const is_virtual = flag & IS_VIRTUAL_KEY != 0;
    const fmt = if (is_unicode)
        keyboard_event_fmt_uni
    else if (is_virtual)
        keyboard_event_fmt_vir
    else
        keyboard_event_fmt;
    return std.fmt.bufPrint(
        &event_buf,
        fmt,
        .{
            if (is_unicode) attrs.char_code else attrs.key,
            attrs.is_shift,
            attrs.is_alt,
            attrs.is_ctrl,
            attrs.is_meta,
            attrs.is_repeat,
            attrs.char_code,
        },
    ) catch unreachable;
}
inline fn mouseEventJson(attrs: struct { button: []const u8, buttons: []const u8, x: i32, y: i32, is_shift: bool, is_alt: bool, is_ctrl: bool, is_meta: bool }) []const u8 {
    return std.fmt.bufPrint(
        &event_buf,
        mouse_event_fmt,
        .{
            attrs.button,
            attrs.buttons,
            attrs.x,
            attrs.y,
            attrs.is_shift,
            attrs.is_alt,
            attrs.is_ctrl,
            attrs.is_meta,
        },
    ) catch unreachable;
}
inline fn wheelEventJson(attrs: struct { button: []const u8, buttons: []const u8, x: i32, y: i32, is_shift: bool, is_alt: bool, is_ctrl: bool, is_meta: bool, wheel_delta_y: i8 }) []const u8 {
    return std.fmt.bufPrint(
        &event_buf,
        wheel_event_fmt,
        .{
            attrs.button,
            attrs.buttons,
            attrs.x,
            attrs.y,
            attrs.is_shift,
            attrs.is_alt,
            attrs.is_ctrl,
            attrs.is_meta,
            attrs.wheel_delta_y,
        },
    ) catch unreachable;
}
const Parser = struct {
    state: InputState = .Normal,
    buffer: [64]u8 = undefined,
    buf_idx: usize = 0,

    pub fn processEvent(self: *Parser, record: KEY_EVENT_RECORD) void {
        // 1. 过滤掉按键释放事件 (通常 TUI 不需要处理 KeyUp)
        if (record.bKeyDown == .FALSE) return;

        const char_code = record.uChar.UnicodeChar;

        // ---------------------------------------------------------
        // 情况 A: 汉字 / Unicode 字符
        // ---------------------------------------------------------
        // Windows 使用 UTF-16 (u16)，大部分汉字在这个范围内
        // 如果是 Emoji 等辅助平面字符，可能需要处理两个连续的 Event (Surrogate Pairs)
        if (char_code > 0xFF) { // 大于 255 基本上就是宽字符了
            logger.logDebugFmt("汉字/Unicode输入: {u} (Code: {d})", .{ char_code, char_code });
            self.reset();
            _ = event_bus.event_bus_emit_bytes(
                @intFromEnum(event_bus.EventType.KeyboardEvent),
                keyboardEventJson(
                    IS_UNICODE_KEY,
                    .{
                        .key = "",
                        .is_shift = false,
                        .is_alt = false,
                        .is_ctrl = false,
                        .is_meta = false,
                        .is_repeat = false,
                        .char_code = char_code,
                    },
                ),
            );
            return;
        }

        const ascii: u8 = @intCast(char_code);

        // ---------------------------------------------------------
        // 情况 B: 鼠标事件 / ANSI 序列处理 (状态机)
        // ---------------------------------------------------------
        switch (self.state) {
            .Normal => {
                if (ascii == 0x1B) { // ESC 键
                    self.state = .EscReceived;
                    self.buf_idx = 0;
                    self.buffer[self.buf_idx] = ascii;
                    self.buf_idx += 1;
                } else {
                    // 普通 ASCII 字符
                    self.handleNormalKey(record);
                }
            },
            .EscReceived => {
                // 如果紧接着 ESC 收到的是 '[' (0x5B)，说明是 CSI 序列 (可能是鼠标，也可能是方向键)
                if (ascii == '[') {
                    self.state = .CsiReceived;
                    self.buffer[self.buf_idx] = ascii;
                    self.buf_idx += 1;
                } else if (ascii == 'O') {
                    self.state = .Ss3Received;
                    self.buffer[self.buf_idx] = ascii;
                    self.buf_idx += 1;
                } else {
                    // 如果 ESC 后面跟的不是 [，那说明用户就是按了一下 ESC，然后按了别的键
                    // 处理之前的 ESC
                    logger.logDebug("按键: ESC");
                    self.reset();
                    // 重新处理当前这个字符
                    self.processEvent(record);
                }
            },
            .CsiReceived => {
                // 这里开始收集序列参数，例如: \x1b[<0;23;45M
                self.buffer[self.buf_idx] = ascii;
                self.buf_idx += 1;

                // 判断序列结束字符
                // 鼠标 VT 序列通常以 'M' (按下) 或 'm' (释放) 结尾
                // 普通功能键通常以 '~' 或 字母(A-Z) 结尾
                if ((ascii >= 'A' and ascii <= 'Z') or (ascii >= 'a' and ascii <= 'z') or ascii == '~') {
                    self.parseBufferedSequence();
                    self.reset();
                }
            },
            .Ss3Received => {
                // 三个字节的序列
                self.buffer[self.buf_idx] = ascii;
                self.buf_idx += 1;
                if (self.buf_idx == 3) {
                    self.parseBufferedSequence();
                    self.reset();
                }
            },
        }
    }

    fn handleNormalKey(_: *Parser, record: KEY_EVENT_RECORD) void {
        const unicode_char = record.uChar.UnicodeChar;
        const virtual_code = record.wVirtualKeyCode;
        const state = record.dwControlKeyState;
        const is_ctrl = (state & (LEFT_CTRL_PRESSED | RIGHT_CTRL_PRESSED)) != 0;
        const is_alt = (state & (LEFT_ALT_PRESSED | RIGHT_ALT_PRESSED)) != 0;
        const is_shift = (state & SHIFT_PRESSED) != 0;
        const is_repeat = record.wRepeatCount > 1;
        var slice: ?[]const u8 = null;

        if (unicode_char == 0) {
            logger.logDebugFmt("特殊键 (VirtualKey: {})", .{virtual_code});
            // 情况 1: 特殊键 (F1, Home, Arrow, etc.)
            // char 字段设为 null，只传 code
            logger.logDebugFmt("特殊键: {}", .{virtual_code});

            slice = keyboardEventJson(IS_VIRTUAL_KEY, .{
                .key = if (mapper.mapVirtualKeyName(virtual_code)) |name| name else "Unidentified",
                .is_shift = is_shift,
                .is_alt = is_alt,
                .is_ctrl = is_ctrl,
                .is_meta = virtual_code == mapper.VK_LWIN or virtual_code == mapper.VK_RWIN,
                .is_repeat = is_repeat,
                .char_code = virtual_code,
            });
        } else if (unicode_char < 32 or unicode_char == 0x7F) {
            logger.logDebugFmt("控制字符 (Ctrl+Key): {}", .{unicode_char});
            slice = keyboardEventJson(
                IS_VIRTUAL_KEY,
                .{
                    .key = mapper.unicodeToKeyName(unicode_char),
                    .is_shift = is_shift,
                    .is_alt = is_alt,
                    .is_ctrl = is_ctrl,
                    .is_meta = false,
                    .is_repeat = is_repeat,
                    .char_code = unicode_char,
                },
            );
        } else {
            logger.logDebugFmt("普通字符: {u}", .{unicode_char});
            slice = keyboardEventJson(
                IS_UNICODE_KEY,
                .{
                    .key = "",
                    .is_shift = is_shift,
                    .is_alt = is_alt,
                    .is_ctrl = is_ctrl,
                    .is_meta = false,
                    .is_repeat = is_repeat,
                    .char_code = unicode_char,
                },
            );
        }

        if (slice) |s| {
            _ = event_bus.event_bus_emit_bytes(
                @intFromEnum(event_bus.EventType.KeyboardEvent),
                s,
            );
        }
    }

    fn parseBufferedSequence(self: *Parser) void {
        const seq = self.buffer[0..self.buf_idx];
        if (std.mem.startsWith(u8, seq, "\x1bO")) {
            self.parseSs3Sequence(seq);
            return;
        } else if (std.mem.startsWith(u8, seq, "\x1b[<")) {
            self.parseSgrMouseSequence(seq);
            return;
        } else if (std.mem.startsWith(u8, seq, "\x1b[")) {
            self.parseCsiSequence(seq);
            return;
        } else {
            logger.logDebugFmt("未知序列: {x}", .{seq});
            return;
        }
    }

    fn parseSs3Sequence(_: *Parser, seq: []const u8) void {
        if (!std.mem.startsWith(u8, seq, "\x1bO")) {
            logger.logDebugFmt("未知SS3序列: {x}", .{seq});
            return;
        }
        const last_char = seq[seq.len - 1];
        if (last_char >= 'P' and last_char <= 'S') {
            logger.logDebugFmt("功能键: F{d}", .{last_char - 'P' + 1});
            const key = if (last_char == 'P')
                "F1"
            else if (last_char == 'Q')
                "F2"
            else if (last_char == 'R')
                "F3"
            else if (last_char == 'S')
                "F4"
            else
                "";
            _ = event_bus.event_bus_emit_bytes(
                @intFromEnum(event_bus.EventType.KeyboardEvent),
                keyboardEventJson(
                    IS_VIRTUAL_KEY,
                    .{
                        .key = key,
                        .is_shift = false,
                        .is_alt = false,
                        .is_ctrl = false,
                        .is_meta = false,
                        .char_code = 0,
                        .is_repeat = false,
                    },
                ),
            );
        }
    }

    fn parseSgrMouseSequence(_: *Parser, seq: []const u8) void {
        // 这是一个 SGR 鼠标模式序列: \x1b[<b;x;yM
        if (seq.len < 6) return;
        const content = seq[3 .. seq.len - 1];
        const is_release = seq[seq.len - 1] == 'm'; // 'M' (按下/移动) 或 'm' (松开)

        var iter = std.mem.splitScalar(u8, content, ';');
        const pb_str = iter.next() orelse return;
        const px_str = iter.next() orelse return;
        const py_str = iter.next() orelse return;

        var pb = std.fmt.parseInt(u8, pb_str, 10) catch return;
        const px = std.fmt.parseInt(u16, px_str, 10) catch return;
        const py = std.fmt.parseInt(u16, py_str, 10) catch return;
        const is_shift = (pb & 0x04) != 0;
        if (is_shift) {
            pb ^= 0x04;
        }
        const is_alt = (pb & 0x08) != 0;
        if (is_alt) {
            pb ^= 0x08;
        }
        const is_ctrl = (pb & 0x10) != 0;
        if (is_ctrl) {
            pb ^= 0x10;
        }
        const is_drag = (pb & 0x20) != 0;
        if (is_drag) {
            pb ^= 0x20;
        }

        var button: ?[]const u8 = null;
        var buttons: ?[]const u8 = null;

        switch (pb) {
            0 => {
                logger.logDebugFmt("鼠标左键{s}，x: {}, y: {}", .{
                    if (is_release) "释放" else "按下",
                    px,
                    py,
                });
                button = "0";
            },
            1 => {
                logger.logDebugFmt("鼠标中键{s}，x: {}, y: {}", .{
                    if (is_release) "释放" else "按下",
                    px,
                    py,
                });
                button = "1";
            },
            2 => {
                logger.logDebugFmt("鼠标右键{s}，x: {}, y: {}", .{
                    if (is_release) "释放" else "按下",
                    px,
                    py,
                });
                button = "2";
            },
            3 => {
                logger.logDebugFmt("鼠标移动，x: {}, y: {}, 是否拖动: {}", .{ px, py, is_drag });
                if (is_drag) {
                    buttons = "1";
                } else {
                    buttons = "0";
                }
            },
            64 => {
                logger.logDebugFmt("鼠标滚轮上，x: {}, y: {}", .{ px, py });
                _ = event_bus.event_bus_emit_bytes(
                    @intFromEnum(event_bus.EventType.WheelEvent),
                    wheelEventJson(
                        .{
                            .button = "1",
                            .buttons = "null",
                            .x = px,
                            .y = py,
                            .is_shift = is_shift,
                            .is_alt = is_alt,
                            .is_ctrl = is_ctrl,
                            .is_meta = false,
                            .wheel_delta_y = -1,
                        },
                    ),
                );
                return;
            },
            65 => {
                logger.logDebugFmt("鼠标滚轮下，x: {}, y: {}", .{ px, py });
                _ = event_bus.event_bus_emit_bytes(
                    @intFromEnum(event_bus.EventType.WheelEvent),
                    wheelEventJson(
                        .{
                            .button = "1",
                            .buttons = "null",
                            .x = px,
                            .y = py,
                            .is_shift = is_shift,
                            .is_alt = is_alt,
                            .is_ctrl = is_ctrl,
                            .is_meta = false,
                            .wheel_delta_y = 1,
                        },
                    ),
                );
                return;
            },
            else => {
                logger.logWarningFmt("不支持的鼠标事件序列，pb: {}, x: {}, y: {}", .{ pb, px, py });
            },
        }
        if (button) |b| {
            _ = event_bus.event_bus_emit_bytes(
                @intFromEnum(event_bus.EventType.MouseEvent),
                mouseEventJson(
                    .{
                        .button = b,
                        .buttons = "null",
                        .x = px,
                        .y = py,
                        .is_shift = is_shift,
                        .is_alt = is_alt,
                        .is_ctrl = is_ctrl,
                        .is_meta = false,
                    },
                ),
            );
        } else if (buttons) |b| {
            _ = event_bus.event_bus_emit_bytes(
                @intFromEnum(event_bus.EventType.MouseEvent),
                mouseEventJson(
                    .{
                        .button = "null",
                        .buttons = b,
                        .x = px,
                        .y = py,
                        .is_shift = is_shift,
                        .is_alt = is_alt,
                        .is_ctrl = is_ctrl,
                        .is_meta = false,
                    },
                ),
            );
        } else {
            logger.logDebugFmt("未知SGR鼠标序列: {x}", .{seq});
            return;
        }
    }

    fn parseCsiSequence(_: *Parser, seq: []const u8) void {
        const vkey: ?u16 = blk: {
            if (std.mem.eql(u8, seq, "\x1b[A")) break :blk mapper.VK_UP;
            if (std.mem.eql(u8, seq, "\x1b[B")) break :blk mapper.VK_DOWN;
            if (std.mem.eql(u8, seq, "\x1b[C")) break :blk mapper.VK_RIGHT;
            if (std.mem.eql(u8, seq, "\x1b[D")) break :blk mapper.VK_LEFT;
            if (std.mem.eql(u8, seq, "\x1b[H")) break :blk mapper.VK_HOME;
            if (std.mem.eql(u8, seq, "\x1b[F")) break :blk mapper.VK_END;

            if (std.mem.eql(u8, seq, "\x1b[5~")) break :blk mapper.VK_PRIOR; // PageUp
            if (std.mem.eql(u8, seq, "\x1b[6~")) break :blk mapper.VK_NEXT; // PageDown
            if (std.mem.eql(u8, seq, "\x1b[2~")) break :blk mapper.VK_INSERT;
            if (std.mem.eql(u8, seq, "\x1b[3~")) break :blk mapper.VK_DELETE;

            if (std.mem.eql(u8, seq, "\x1b[15~")) break :blk mapper.VK_F5;
            if (std.mem.eql(u8, seq, "\x1b[17~")) break :blk mapper.VK_F6;
            if (std.mem.eql(u8, seq, "\x1b[18~")) break :blk mapper.VK_F7;
            if (std.mem.eql(u8, seq, "\x1b[19~")) break :blk mapper.VK_F8;
            if (std.mem.eql(u8, seq, "\x1b[20~")) break :blk mapper.VK_F9;
            if (std.mem.eql(u8, seq, "\x1b[21~")) break :blk mapper.VK_F10;
            if (std.mem.eql(u8, seq, "\x1b[23~")) break :blk mapper.VK_F11;
            if (std.mem.eql(u8, seq, "\x1b[24~")) break :blk mapper.VK_F12;
            if (std.mem.eql(u8, seq, "\x1b[25~")) break :blk mapper.VK_F13;
            if (std.mem.eql(u8, seq, "\x1b[26~")) break :blk mapper.VK_F14;
            if (std.mem.eql(u8, seq, "\x1b[27~")) break :blk mapper.VK_F15;
            if (std.mem.eql(u8, seq, "\x1b[28~")) break :blk mapper.VK_F16;
            if (std.mem.eql(u8, seq, "\x1b[29~")) break :blk mapper.VK_F17;
            if (std.mem.eql(u8, seq, "\x1b[30~")) break :blk mapper.VK_F18;
            if (std.mem.eql(u8, seq, "\x1b[31~")) break :blk mapper.VK_F19;
            if (std.mem.eql(u8, seq, "\x1b[32~")) break :blk mapper.VK_F20;

            logger.logDebugFmt("其他 ANSI 序列: {x}", .{seq});
            break :blk null;
        };
        if (vkey) |k| {
            const name = mapper.mapVirtualKeyName(k) orelse "Unidentified";
            logger.logDebugFmt("功能键: {s}", .{name});
            _ = keyboardEventJson(
                IS_VIRTUAL_KEY,
                .{
                    .key = name,
                    .is_shift = false,
                    .is_alt = false,
                    .is_ctrl = false,
                    .is_meta = false,
                    .char_code = 0,
                    .is_repeat = false,
                },
            );
        }
    }

    fn reset(self: *Parser) void {
        self.state = .Normal;
        self.buf_idx = 0;
    }
};

fn listen() void {
    logger.logInfo("input listener starting...");
    const stdin_handle = GetStdHandle(@intFromEnum(mode.STD_HANDLE.INPUT_HANDLE)).?;

    // const FOCUS_EVENT = 0x0010;
    const KEY_EVENT = 0x0001;
    // const MENU_EVENT = 0x0008;
    const MOUSE_EVENT = 0x0002;
    // const WINDOW_BUFFER_SIZE_EVENT = 0x0004;

    // 获取当前模式
    mode.switchMouseInputMode();

    while (!should_stop.load(.acquire)) {
        const waitResult = WaitForSingleObject(stdin_handle, 16);
        if (waitResult != 0) { // WAIT_OBJECT_0 = 0
            continue;
        }
        var input_buffer: [128]INPUT_RECORD = undefined;
        var events_read: u32 = 0;
        if (ReadConsoleInputW(
            stdin_handle,
            &input_buffer,
            128,
            &events_read,
        ) == .FALSE) {
            logger.logError("ReadConsoleInputW failed");
            break;
        }

        for (0..events_read) |i| {
            const record = input_buffer[i];
            if (record.EventType == MOUSE_EVENT) {
                handleMouseEvent(record);
            } else if (record.EventType == KEY_EVENT) {
                handleKeyEvent(record);
            }
        }
        if (logger.current_log_level == logger.LOG_LEVEL_DEBUG) {
            logger.flush();
        }
    }
}

inline fn handleMouseEvent(record: INPUT_RECORD) void {
    const mouse = record.Event.MouseEvent;
    var handle_flag = false;

    // 检测按钮点击
    if (mouse.dwButtonState & FROM_LEFT_1ST_BUTTON_PRESSED != 0) {
        logger.logDebugFmt("mouse left click: ({}, {})", .{
            mouse.dwMousePosition.X,
            mouse.dwMousePosition.Y,
        });
        handle_flag = true;
    }

    if (mouse.dwButtonState & RIGHTMOST_BUTTON_PRESSED != 0) {
        logger.logDebugFmt("mouse right click: ({}, {})", .{
            mouse.dwMousePosition.X,
            mouse.dwMousePosition.Y,
        });
        handle_flag = true;
    }

    if (mouse.dwButtonState & FROM_LEFT_2ND_BUTTON_PRESSED != 0) {
        logger.logDebugFmt("mouse middle click: ({}, {})", .{
            mouse.dwMousePosition.X,
            mouse.dwMousePosition.Y,
        });
        handle_flag = true;
    }

    // 检测鼠标移动
    if (mouse.dwEventFlags & MOUSE_MOVED != 0 and mouse.dwButtonState == 0) {
        // try stdout.print("mouse move: ({}, {})\n", .{
        //     mouse.dwMousePosition.X,
        //     mouse.dwMousePosition.Y,
        // });
        handle_flag = true;
    }

    // 检测双击
    if (mouse.dwEventFlags & DOUBLE_CLICK != 0) {
        logger.logDebugFmt("mouse double click: ({}, {})", .{
            mouse.dwMousePosition.X,
            mouse.dwMousePosition.Y,
        });
        handle_flag = true;
    }

    // 检测滚轮
    if (mouse.dwEventFlags & MOUSE_WHEELED != 0) {
        const delta = @as(i32, @bitCast(mouse.dwButtonState)) >> 16;
        const direction = if (delta > 0) "up" else "down";
        logger.logDebugFmt("mouse wheel {s}: ({}, {})", .{
            direction,
            mouse.dwMousePosition.X,
            mouse.dwMousePosition.Y,
        });
        handle_flag = true;
    }
    if (!handle_flag) {
        logger.logWarningFmt("Unhandled mouse event - pos:({},{}), buttons:{X:0>8}, flags:{X:0>8}", .{ mouse.dwMousePosition.X, mouse.dwMousePosition.Y, mouse.dwButtonState, mouse.dwEventFlags });
    }
}

var parser = Parser{};
inline fn handleKeyEvent(record: INPUT_RECORD) void {
    parser.processEvent(record.Event.KeyEvent);
}
