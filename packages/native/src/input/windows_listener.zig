const std = @import("std");
const builtin = @import("builtin");
const logger = @import("../core/logger.zig");
const windows = std.os.windows;
const mode = @import("./windows_mode.zig");
const mapper = @import("./windows_mapper.zig");
const normalize = @import("./normalize.zig");

comptime {
    if (builtin.target.os.tag != .windows) {
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

const Parser = struct {
    state: normalize.InputState = .Normal,
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
            normalize.emitKeyboardEvent(
                normalize.buildModifiers(false, false, false, false, false),
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
                        self.pending_esc_modifiers = normalize.buildModifiers(
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
            // Windows reads whole characters from the Console API and never
            // enters the byte-wise UTF-8 accumulation state.
            .Utf8Sequence => {},
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
        if ((unicode_char == 0x0D or unicode_char == 0x0A) and !is_ctrl and isCtrlPhysicallyHeld()) {
            is_ctrl = true;
        }

        if (unicode_char == 0) {
            logger.logDebugFmt("特殊键 (VirtualKey: {})", .{virtual_code});
            const name = mapper.mapVirtualKeyName(virtual_code) orelse "Unidentified";
            normalize.emitKeyboardEvent(
                normalize.buildModifiers(is_shift, is_alt, is_ctrl, virtual_code == mapper.VK_LWIN or virtual_code == mapper.VK_RWIN, is_repeat),
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
                normalize.emitKeyboardEvent(
                    normalize.buildModifiers(isShiftPhysicallyHeld(), is_alt, true, false, is_repeat),
                    unicode_char,
                    letter_buf[0..],
                );
            } else {
                logger.logDebugFmt("控制字符 (Unicode: {}, VK: {}, Key: {s})", .{ unicode_char, virtual_code, key_name });
                normalize.emitKeyboardEvent(
                    normalize.buildModifiers(is_shift, is_alt, is_ctrl, false, is_repeat),
                    unicode_char,
                    key_name,
                );
            }
        } else {
            logger.logDebugFmt("普通字符: {u}", .{unicode_char});
            // Encode unicode_char as UTF-8 for the key field
            var key_buf: [4]u8 = undefined;
            const key_len = std.unicode.utf8Encode(unicode_char, &key_buf) catch 0;
            normalize.emitKeyboardEvent(
                normalize.buildModifiers(is_shift, is_alt, is_ctrl, false, is_repeat),
                unicode_char,
                key_buf[0..key_len],
            );
        }
    }

    fn parseBufferedSequence(self: *Parser) void {
        normalize.parseBufferedSequence(self, self.buffer[0..self.buf_idx]);
    }

    pub fn parseCsiSequence(_: *Parser, seq: []const u8) void {
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
                const mods = normalize.decodeCsiModifiers(mod_num);
                mod_shift = mods.shift;
                mod_alt = mods.alt;
                mod_ctrl = mods.ctrl;
            }
        }

        var vkey: ?u16 = null;
        if (final_char == '~') {
            if (normalize.csiKeyFromP1(param1)) |key| {
                vkey = mapper.csiKeyToVirtualKey(key);
            } else {
                logger.logDebugFmt("其他 CSI~ 序列: {s}", .{seq});
            }
        } else if (normalize.csiKeyFromFinalChar(final_char)) |key| {
            vkey = mapper.csiKeyToVirtualKey(key);
        } else {
            logger.logDebugFmt("其他 CSI 序列: {s}", .{seq});
        }
        if (final_char == 'Z') {
            mod_shift = true;
        }

        if (vkey) |k| {
            const name = mapper.mapVirtualKeyName(k) orelse "Unidentified";
            logger.logDebugFmt("功能键: {s}", .{name});
            normalize.emitKeyboardEvent(
                normalize.buildModifiers(mod_shift, mod_alt, mod_ctrl, false, false),
                k,
                name,
            );
        }
    }

    pub fn flushPendingEsc(self: *Parser) void {
        if (self.state == .EscReceived) {
            normalize.emitKeyboardEvent(self.pending_esc_modifiers, 0x1B, "Escape");
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
    const stdin_handle = GetStdHandle(@backingInt(mode.STD_HANDLE.INPUT_HANDLE)).?;

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
    normalize.emitResizeEvent(
        @intCast(size.Y),
        @intCast(size.X),
    );
}
