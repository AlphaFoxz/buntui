const std = @import("std");
const builtin = @import("builtin");
const logger = @import("../core/logger.zig");
const windows = std.os.windows;
const mode = @import("./windows_mode.zig");
const event_bus = @import("../core/event_bus.zig");
const payloads = @import("../core/event_payloads.zig");
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

extern "user32" fn GetAsyncKeyState(vKey: i32) callconv(.winapi) i16;

fn isCtrlPhysicallyHeld() bool {
    const VK_CONTROL: i32 = 0x11;
    const state = GetAsyncKeyState(VK_CONTROL);
    return (@as(u16, @bitCast(state)) & 0x8000) != 0;
}

fn isShiftPhysicallyHeld() bool {
    const VK_SHIFT: i32 = 0x10;
    const state = GetAsyncKeyState(VK_SHIFT);
    return (@as(u16, @bitCast(state)) & 0x8000) != 0;
}

const RIGHT_ALT_PRESSED = 0x0001;
const LEFT_ALT_PRESSED = 0x0002;
const RIGHT_CTRL_PRESSED = 0x0004;
const LEFT_CTRL_PRESSED = 0x0008;
const SHIFT_PRESSED = 0x0010;

const InputState = enum {
    Normal,
    EscReceived,
    CsiReceived,
    Ss3Received,
};

// Binary payload buffer (240 bytes = slot data area minus header)
var binary_buf: [240]u8 = undefined;

inline fn buildModifiers(is_shift: bool, is_alt: bool, is_ctrl: bool, is_meta: bool, is_repeat: bool) u8 {
    var mods: u8 = 0;
    if (is_shift) mods |= payloads.MOD_SHIFT;
    if (is_ctrl) mods |= payloads.MOD_CTRL;
    if (is_alt) mods |= payloads.MOD_ALT;
    if (is_meta) mods |= payloads.MOD_META;
    if (is_repeat) mods |= payloads.MOD_REPEAT;
    return mods;
}

inline fn emitKeyboardEvent(modifiers: u8, char_code: u16, key: []const u8) void {
    binary_buf[0] = modifiers;
    std.mem.writeInt(u16, binary_buf[1..3], char_code, .little);
    const key_len: u8 = @intCast(@min(key.len, 236));
    binary_buf[3] = key_len;
    if (key_len > 0) {
        @memcpy(binary_buf[4 .. 4 + key_len], key[0..key_len]);
    }
    _ = event_bus.event_bus_emit_bytes(
        @intFromEnum(event_bus.EventType.KeyboardEvent),
        binary_buf[0 .. 4 + key_len],
    );
}

inline fn emitMouseEvent(modifiers: u8, has_button: bool, button: u8, has_buttons: bool, buttons: u8, x: u16, y: u16, is_release: bool) void {
    const payload = payloads.MousePayload{
        .modifiers = modifiers,
        .flags = (if (has_button) payloads.HAS_BUTTON else @as(u8, 0)) |
            (if (has_buttons) payloads.HAS_BUTTONS else @as(u8, 0)) |
            (if (is_release) payloads.IS_RELEASE else @as(u8, 0)),
        .button = button,
        .buttons = buttons,
        .x = x,
        .y = y,
    };
    _ = event_bus.event_bus_emit_bytes(
        @intFromEnum(event_bus.EventType.MouseEvent),
        std.mem.asBytes(&payload),
    );
}

inline fn emitWheelEvent(modifiers: u8, has_button: bool, button: u8, has_buttons: bool, buttons: u8, x: u16, y: u16, wheel_delta_y: i8) void {
    const payload = payloads.WheelPayload{
        .modifiers = modifiers,
        .flags = (if (has_button) payloads.HAS_BUTTON else @as(u8, 0)) |
            (if (has_buttons) payloads.HAS_BUTTONS else @as(u8, 0)),
        .button = button,
        .buttons = buttons,
        .x = x,
        .y = y,
        .wheel_delta_y = wheel_delta_y,
    };
    _ = event_bus.event_bus_emit_bytes(
        @intFromEnum(event_bus.EventType.WheelEvent),
        std.mem.asBytes(&payload),
    );
}

inline fn emitResizeEvent(rows: u16, cols: u16) void {
    const payload = payloads.TermResizePayload{
        .rows = rows,
        .cols = cols,
    };
    _ = event_bus.event_bus_emit_bytes(
        @intFromEnum(event_bus.EventType.TermResizeEvent),
        std.mem.asBytes(&payload),
    );
}

const Parser = struct {
    state: InputState = .Normal,
    buffer: [64]u8 = undefined,
    buf_idx: usize = 0,
    pending_esc_modifiers: u8 = 0,

    pub fn processEvent(self: *Parser, record: KEY_EVENT_RECORD) void {
        if (record.bKeyDown == .FALSE) return;

        const char_code = record.uChar.UnicodeChar;

        // Unicode characters (CJK, etc.)
        if (char_code > 0xFF) {
            logger.logDebugFmt("汉字/Unicode输入: {u} (Code: {d})", .{ char_code, char_code });
            self.reset();
            var key_buf: [4]u8 = undefined;
            const key_len = std.unicode.utf8Encode(char_code, &key_buf) catch 0;
            emitKeyboardEvent(
                buildModifiers(false, false, false, false, false),
                char_code,
                key_buf[0..key_len],
            );
            return;
        }

        const ascii: u8 = @intCast(char_code);

        switch (self.state) {
            .Normal => {
                if (ascii == 0x1B) {
                    // Windows VT input mode: a real Escape key press has
                    // VirtualKeyCode == VK_ESCAPE, while the 0x1B byte that
                    // starts a VT sequence (mouse, etc.) uses VK 0 or another
                    // value. Emit directly for a real key press so it isn't
                    // lost waiting for a follow-up character that never comes.
                    if (record.wVirtualKeyCode == mapper.VK_ESCAPE) {
                        self.handleNormalKey(record);
                    } else {
                        const ks = record.dwControlKeyState;
                        self.pending_esc_modifiers = buildModifiers(
                            (ks & SHIFT_PRESSED) != 0,
                            (ks & (LEFT_ALT_PRESSED | RIGHT_ALT_PRESSED)) != 0,
                            (ks & (LEFT_CTRL_PRESSED | RIGHT_CTRL_PRESSED)) != 0,
                            false,
                            record.wRepeatCount > 1,
                        );
                        self.state = .EscReceived;
                        self.buf_idx = 0;
                        self.buffer[self.buf_idx] = ascii;
                        self.buf_idx += 1;
                    }
                } else {
                    self.handleNormalKey(record);
                }
            },
            .EscReceived => {
                if (ascii == '[') {
                    self.state = .CsiReceived;
                    self.buffer[self.buf_idx] = ascii;
                    self.buf_idx += 1;
                } else if (ascii == 'O') {
                    self.state = .Ss3Received;
                    self.buffer[self.buf_idx] = ascii;
                    self.buf_idx += 1;
                } else {
                    // Alt+key: non-VK_ESCAPE 0x1B + non-sequence char is
                    // always Alt+key in VT input mode.  VT mode may strip
                    // all modifiers from dwControlKeyState, so we set Alt
                    // unconditionally and use physical key state for Shift/Ctrl.
                    var modified = record;
                    modified.dwControlKeyState |= LEFT_ALT_PRESSED | RIGHT_ALT_PRESSED;
                    if (isShiftPhysicallyHeld()) {
                        modified.dwControlKeyState |= SHIFT_PRESSED;
                    }
                    if (isCtrlPhysicallyHeld()) {
                        modified.dwControlKeyState |= LEFT_CTRL_PRESSED | RIGHT_CTRL_PRESSED;
                    }
                    self.reset();
                    self.handleNormalKey(modified);
                }
            },
            .CsiReceived => {
                self.buffer[self.buf_idx] = ascii;
                self.buf_idx += 1;

                if ((ascii >= 'A' and ascii <= 'Z') or (ascii >= 'a' and ascii <= 'z') or ascii == '~') {
                    self.parseBufferedSequence();
                    self.reset();
                }
            },
            .Ss3Received => {
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
        var is_ctrl = (state & (LEFT_CTRL_PRESSED | RIGHT_CTRL_PRESSED)) != 0;
        const is_alt = (state & (LEFT_ALT_PRESSED | RIGHT_ALT_PRESSED)) != 0;
        const is_shift = (state & SHIFT_PRESSED) != 0;
        const is_repeat = record.wRepeatCount > 1;
        if (unicode_char == 0x08 and virtual_code == 0 and !is_ctrl) {
            is_ctrl = true;
        }

        if (unicode_char == 0) {
            logger.logDebugFmt("特殊键 (VirtualKey: {})", .{virtual_code});
            const name = mapper.mapVirtualKeyName(virtual_code) orelse "Unidentified";
            emitKeyboardEvent(
                buildModifiers(is_shift, is_alt, is_ctrl, virtual_code == mapper.VK_LWIN or virtual_code == mapper.VK_RWIN, is_repeat),
                virtual_code,
                name,
            );
        } else if (unicode_char < 32 or unicode_char == 0x7F) {
            // Prefer virtual key mapping for control chars (e.g. Backspace may
            // report unicode_char=0x7F in VT input mode, but virtual_code is
            // always VK_BACK).
            const vk_name = mapper.mapVirtualKeyName(virtual_code);
            const key_name = vk_name orelse mapper.unicodeToKeyName(unicode_char);

            // Ctrl+letter: 0x01-0x1A maps to Ctrl+A through Ctrl+Z.
            // VT input mode rewrites VK codes and strips Ctrl from
            // dwControlKeyState, so we use GetAsyncKeyState to detect
            // the physical Ctrl key.
            if (unicode_char >= 0x01 and unicode_char <= 0x1A and std.mem.eql(u8, key_name, "Unidentified") and isCtrlPhysicallyHeld()) {
                var letter_buf = [_]u8{0};
                letter_buf[0] = @as(u8, @intCast(unicode_char - 0x01 + 'a'));
                logger.logDebugFmt("Ctrl+字母: {s}", .{letter_buf[0..]});
                emitKeyboardEvent(
                    buildModifiers(isShiftPhysicallyHeld(), is_alt, true, false, is_repeat),
                    unicode_char,
                    letter_buf[0..],
                );
            } else {
                logger.logDebugFmt("控制字符 (Unicode: {}, VK: {}, Key: {s})", .{ unicode_char, virtual_code, key_name });
                emitKeyboardEvent(
                    buildModifiers(is_shift, is_alt, is_ctrl, false, is_repeat),
                    unicode_char,
                    key_name,
                );
            }
        } else {
            logger.logDebugFmt("普通字符: {u}", .{unicode_char});
            // Encode unicode_char as UTF-8 for the key field
            var key_buf: [4]u8 = undefined;
            const key_len = std.unicode.utf8Encode(unicode_char, &key_buf) catch 0;
            emitKeyboardEvent(
                buildModifiers(is_shift, is_alt, is_ctrl, false, is_repeat),
                unicode_char,
                key_buf[0..key_len],
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
            emitKeyboardEvent(
                buildModifiers(false, false, false, false, false),
                0,
                key,
            );
        }
    }

    fn parseSgrMouseSequence(_: *Parser, seq: []const u8) void {
        if (seq.len < 6) return;
        const content = seq[3 .. seq.len - 1];
        const is_release = seq[seq.len - 1] == 'm';

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

        const mods = buildModifiers(is_shift, is_alt, is_ctrl, false, false);

        switch (pb) {
            0 => {
                if (is_drag) {
                    logger.logDebugFmt("鼠标左键拖动，x: {}, y: {}", .{ px, py });
                    emitMouseEvent(mods, false, 0, true, 1, px, py, false);
                } else {
                    logger.logDebugFmt("鼠标左键{s}，x: {}, y: {}", .{
                        if (is_release) "释放" else "按下",
                        px,
                        py,
                    });
                    emitMouseEvent(mods, true, 0, false, 0, px, py, is_release);
                }
            },
            1 => {
                if (is_drag) {
                    logger.logDebugFmt("鼠标中键拖动，x: {}, y: {}", .{ px, py });
                    emitMouseEvent(mods, false, 1, true, 1, px, py, false);
                } else {
                    logger.logDebugFmt("鼠标中键{s}，x: {}, y: {}", .{
                        if (is_release) "释放" else "按下",
                        px,
                        py,
                    });
                    emitMouseEvent(mods, true, 1, false, 0, px, py, is_release);
                }
            },
            2 => {
                if (is_drag) {
                    logger.logDebugFmt("鼠标右键拖动，x: {}, y: {}", .{ px, py });
                    emitMouseEvent(mods, false, 2, true, 1, px, py, false);
                } else {
                    logger.logDebugFmt("鼠标右键{s}，x: {}, y: {}", .{
                        if (is_release) "释放" else "按下",
                        px,
                        py,
                    });
                    emitMouseEvent(mods, true, 2, false, 0, px, py, is_release);
                }
            },
            3 => {
                logger.logDebugFmt("鼠标移动，x: {}, y: {}, 是否拖动: {}", .{ px, py, is_drag });
                emitMouseEvent(mods, false, 0, true, if (is_drag) 1 else 0, px, py, false);
            },
            64 => {
                logger.logDebugFmt("鼠标滚轮上，x: {}, y: {}", .{ px, py });
                emitWheelEvent(mods, true, 1, false, 0, px, py, -1);
            },
            65 => {
                logger.logDebugFmt("鼠标滚轮下，x: {}, y: {}", .{ px, py });
                emitWheelEvent(mods, true, 1, false, 0, px, py, 1);
            },
            else => {
                logger.logWarningFmt("不支持的鼠标事件序列，pb: {}, x: {}, y: {}", .{ pb, px, py });
            },
        }
    }

    fn parseCsiSequence(_: *Parser, seq: []const u8) void {
        // seq starts with \x1b[, e.g. "\x1b[A" or "\x1b[1;2D"
        const content = seq[2..];
        if (content.len == 0) return;

        const final_char = content[content.len - 1];
        const params = content[0 .. content.len - 1];

        var mod_shift: bool = false;
        var mod_alt: bool = false;
        var mod_ctrl: bool = false;
        var param1: u16 = 0;

        if (params.len > 0) {
            var iter = std.mem.splitScalar(u8, params, ';');
            if (iter.next()) |p1| {
                param1 = std.fmt.parseInt(u16, p1, 10) catch 0;
            }
            if (iter.next()) |p2| {
                const mod_num = std.fmt.parseInt(u8, p2, 10) catch 1;
                switch (mod_num) {
                    2 => mod_shift = true,
                    3 => mod_alt = true,
                    4 => {
                        mod_shift = true;
                        mod_alt = true;
                    },
                    5 => mod_ctrl = true,
                    6 => {
                        mod_shift = true;
                        mod_ctrl = true;
                    },
                    7 => {
                        mod_alt = true;
                        mod_ctrl = true;
                    },
                    8 => {
                        mod_shift = true;
                        mod_alt = true;
                        mod_ctrl = true;
                    },
                    else => {},
                }
            }
        }

        const vkey: ?u16 = blk: {
            switch (final_char) {
                'A' => break :blk mapper.VK_UP,
                'B' => break :blk mapper.VK_DOWN,
                'C' => break :blk mapper.VK_RIGHT,
                'D' => break :blk mapper.VK_LEFT,
                'H' => break :blk mapper.VK_HOME,
                'F' => break :blk mapper.VK_END,
                'Z' => {
                    mod_shift = true;
                    break :blk mapper.VK_TAB;
                },
                '~' => {
                    switch (param1) {
                        2 => break :blk mapper.VK_INSERT,
                        3 => break :blk mapper.VK_DELETE,
                        5 => break :blk mapper.VK_PRIOR,
                        6 => break :blk mapper.VK_NEXT,
                        15 => break :blk mapper.VK_F5,
                        17 => break :blk mapper.VK_F6,
                        18 => break :blk mapper.VK_F7,
                        19 => break :blk mapper.VK_F8,
                        20 => break :blk mapper.VK_F9,
                        21 => break :blk mapper.VK_F10,
                        23 => break :blk mapper.VK_F11,
                        24 => break :blk mapper.VK_F12,
                        25 => break :blk mapper.VK_F13,
                        26 => break :blk mapper.VK_F14,
                        27 => break :blk mapper.VK_F15,
                        28 => break :blk mapper.VK_F16,
                        29 => break :blk mapper.VK_F17,
                        30 => break :blk mapper.VK_F18,
                        31 => break :blk mapper.VK_F19,
                        32 => break :blk mapper.VK_F20,
                        else => {
                            logger.logDebugFmt("其他 CSI~ 序列: {s}", .{seq});
                            break :blk null;
                        },
                    }
                },
                else => {
                    logger.logDebugFmt("其他 CSI 序列: {s}", .{seq});
                    break :blk null;
                },
            }
        };

        if (vkey) |k| {
            const name = mapper.mapVirtualKeyName(k) orelse "Unidentified";
            logger.logDebugFmt("功能键: {s}", .{name});
            emitKeyboardEvent(
                buildModifiers(mod_shift, mod_alt, mod_ctrl, false, false),
                k,
                name,
            );
        }
    }

    pub fn flushPendingEsc(self: *Parser) void {
        if (self.state == .EscReceived) {
            emitKeyboardEvent(self.pending_esc_modifiers, 0x1B, "Escape");
            self.reset();
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

    const KEY_EVENT = 0x0001;
    const TERM_RESIZE_EVENT = 0x0004;

    mode.switchMouseInputMode();

    while (!should_stop.load(.acquire)) {
        const waitResult = WaitForSingleObject(stdin_handle, 16);
        if (waitResult != 0) {
            parser.flushPendingEsc();
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
            if (record.EventType == KEY_EVENT) {
                handleKeyEvent(record);
            } else if (record.EventType == TERM_RESIZE_EVENT) {
                handleResizeEvent(record);
            }
        }
        if (logger.current_log_level == logger.LOG_LEVEL_DEBUG) {
            logger.flush();
        }
    }
}

var parser = Parser{};
inline fn handleKeyEvent(record: INPUT_RECORD) void {
    parser.processEvent(record.Event.KeyEvent);
}
inline fn handleResizeEvent(record: INPUT_RECORD) void {
    const size = record.Event.WindowBufferSizeEvent.dwSize;
    emitResizeEvent(
        @intCast(size.Y),
        @intCast(size.X),
    );
}
