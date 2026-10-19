const std = @import("std");
const logger = @import("../core/logger.zig");
const event_bus = @import("../core/event_bus.zig");
const payloads = @import("../core/event_payloads.zig");

// Shared input normalization for posix_listener and windows_listener:
// modifier bitmasks, key names, and SGR/SS3/CSI decoding.
// Platform listeners implement the reader part only and must
// delegate normalization here.

pub const InputState = enum {
    Normal,
    EscReceived,
    CsiReceived,
    Ss3Received,
    Utf8Sequence,
};

pub const CsiKey = enum {
    ArrowUp,
    ArrowDown,
    ArrowRight,
    ArrowLeft,
    Home,
    End,
    Tab,
    Insert,
    Delete,
    PageUp,
    PageDown,
    F5,
    F6,
    F7,
    F8,
    F9,
    F10,
    F11,
    F12,
    F13,
    F14,
    F15,
    F16,
    F17,
    F18,
    F19,
    F20,
};

pub const CsiModifiers = struct {
    shift: bool,
    alt: bool,
    ctrl: bool,
};

// Binary payload buffer (240 bytes = slot data area minus header)
var binary_buf: [240]u8 = undefined;

pub inline fn buildModifiers(is_shift: bool, is_alt: bool, is_ctrl: bool, is_meta: bool, is_repeat: bool) u8 {
    var mods: u8 = 0;
    if (is_shift) mods |= payloads.MOD_SHIFT;
    if (is_ctrl) mods |= payloads.MOD_CTRL;
    if (is_alt) mods |= payloads.MOD_ALT;
    if (is_meta) mods |= payloads.MOD_META;
    if (is_repeat) mods |= payloads.MOD_REPEAT;
    return mods;
}

pub inline fn emitKeyboardEvent(modifiers: u8, char_code: u16, key: []const u8) void {
    binary_buf[0] = modifiers;
    std.mem.writeInt(u16, binary_buf[1..3], char_code, .little);
    const key_len: u8 = @intCast(@min(key.len, 236));
    binary_buf[3] = key_len;
    if (key_len > 0) {
        @memcpy(binary_buf[4 .. 4 + key_len], key[0..key_len]);
    }
    _ = event_bus.event_bus_emit_bytes(
        @backingInt(event_bus.EventType.KeyboardEvent),
        binary_buf[0 .. 4 + key_len],
    );
}

pub inline fn emitMouseEvent(modifiers: u8, has_button: bool, button: u8, has_buttons: bool, buttons: u8, x: u16, y: u16, is_release: bool) void {
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
        @backingInt(event_bus.EventType.MouseEvent),
        std.mem.asBytes(&payload),
    );
}

pub inline fn emitWheelEvent(modifiers: u8, has_button: bool, button: u8, has_buttons: bool, buttons: u8, x: u16, y: u16, wheel_delta_y: i8) void {
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
        @backingInt(event_bus.EventType.WheelEvent),
        std.mem.asBytes(&payload),
    );
}

pub inline fn emitResizeEvent(rows: u16, cols: u16) void {
    const payload = payloads.TermResizePayload{
        .rows = rows,
        .cols = cols,
    };
    _ = event_bus.event_bus_emit_bytes(
        @backingInt(event_bus.EventType.TermResizeEvent),
        std.mem.asBytes(&payload),
    );
}

pub fn keyCodeToKeyName(code: u16) []const u8 {
    switch (code) {
        0x08 => return "Backspace",
        0x09 => return "Tab",
        0x0A => return "Enter",
        0x0D => return "Enter",
        0x1B => return "Escape",
        0x20 => return " ",
        0x7F => return "Backspace",
        else => {},
    }
    if (code >= 0x41 and code <= 0x5A) {
        const names = [_][]const u8{
            "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
            "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
        };
        return names[code - 0x41];
    }
    if (code >= 0x61 and code <= 0x7A) {
        const names = [_][]const u8{
            "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
            "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
        };
        return names[code - 0x61];
    }
    if (code >= 0x30 and code <= 0x39) {
        const names = [_][]const u8{ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9" };
        return names[code - 0x30];
    }
    logger.logDebugFmt("未知 key code: {}", .{code});
    return "Unidentified";
}

// Decode modifier from a CSI param value (1=none, 2=shift, 3=alt, 4=shift+alt, 5=ctrl, etc.)
pub fn decodeCsiModifiers(mod_num: u16) CsiModifiers {
    return .{
        .shift = mod_num == 2 or mod_num == 4 or mod_num == 6 or mod_num == 8,
        .alt = mod_num == 3 or mod_num == 4 or mod_num == 7 or mod_num == 8,
        .ctrl = mod_num == 5 or mod_num == 6 or mod_num == 7 or mod_num == 8,
    };
}

pub fn csiKeyFromFinalChar(final_char: u8) ?CsiKey {
    return switch (final_char) {
        'A' => .ArrowUp,
        'B' => .ArrowDown,
        'C' => .ArrowRight,
        'D' => .ArrowLeft,
        'H' => .Home,
        'F' => .End,
        'Z' => .Tab,
        else => null,
    };
}

pub fn csiKeyFromP1(param1: u16) ?CsiKey {
    return switch (param1) {
        2 => .Insert,
        3 => .Delete,
        5 => .PageUp,
        6 => .PageDown,
        15 => .F5,
        17 => .F6,
        18 => .F7,
        19 => .F8,
        20 => .F9,
        21 => .F10,
        23 => .F11,
        24 => .F12,
        25 => .F13,
        26 => .F14,
        27 => .F15,
        28 => .F16,
        29 => .F17,
        30 => .F18,
        31 => .F19,
        32 => .F20,
        else => null,
    };
}

pub fn csiKeyName(key: CsiKey) []const u8 {
    return switch (key) {
        .ArrowUp => "ArrowUp",
        .ArrowDown => "ArrowDown",
        .ArrowRight => "ArrowRight",
        .ArrowLeft => "ArrowLeft",
        .Home => "Home",
        .End => "End",
        .Tab => "Tab",
        .Insert => "Insert",
        .Delete => "Delete",
        .PageUp => "PageUp",
        .PageDown => "PageDown",
        .F5 => "F5",
        .F6 => "F6",
        .F7 => "F7",
        .F8 => "F8",
        .F9 => "F9",
        .F10 => "F10",
        .F11 => "F11",
        .F12 => "F12",
        .F13 => "F13",
        .F14 => "F14",
        .F15 => "F15",
        .F16 => "F16",
        .F17 => "F17",
        .F18 => "F18",
        .F19 => "F19",
        .F20 => "F20",
    };
}

pub fn parseBufferedSequence(parser: anytype, seq: []const u8) void {
    if (std.mem.startsWith(u8, seq, "\x1bO")) {
        parseSs3Sequence(seq);
        return;
    } else if (std.mem.startsWith(u8, seq, "\x1b[<")) {
        parseSgrMouseSequence(seq);
        return;
    } else if (std.mem.startsWith(u8, seq, "\x1b[")) {
        parser.parseCsiSequence(seq);
        return;
    } else {
        logger.logDebugFmt("未知序列: {x}", .{seq});
        return;
    }
}

pub fn parseSs3Sequence(seq: []const u8) void {
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

pub fn parseSgrMouseSequence(seq: []const u8) void {
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

// ============ Tests ============

test "keyCodeToKeyName maps control characters" {
    try std.testing.expectEqualStrings("Backspace", keyCodeToKeyName(0x08));
    try std.testing.expectEqualStrings("Tab", keyCodeToKeyName(0x09));
    try std.testing.expectEqualStrings("Enter", keyCodeToKeyName(0x0D));
    try std.testing.expectEqualStrings("Escape", keyCodeToKeyName(0x1B));
    try std.testing.expectEqualStrings("Backspace", keyCodeToKeyName(0x7F));
}

test "keyCodeToKeyName maps letters" {
    try std.testing.expectEqualStrings("A", keyCodeToKeyName(0x41));
    try std.testing.expectEqualStrings("Z", keyCodeToKeyName(0x5A));
    try std.testing.expectEqualStrings("a", keyCodeToKeyName(0x61));
    try std.testing.expectEqualStrings("z", keyCodeToKeyName(0x7A));
    try std.testing.expectEqualStrings("I", keyCodeToKeyName(0x49));
    try std.testing.expectEqualStrings("i", keyCodeToKeyName(0x69));
}

test "keyCodeToKeyName maps digits" {
    try std.testing.expectEqualStrings("0", keyCodeToKeyName(0x30));
    try std.testing.expectEqualStrings("9", keyCodeToKeyName(0x39));
}

test "keyCodeToKeyName returns Unidentified for unknown" {
    try std.testing.expectEqualStrings("Unidentified", keyCodeToKeyName(0x01));
    try std.testing.expectEqualStrings("Unidentified", keyCodeToKeyName(0x80));
}

test "buildModifiers composes bitmask" {
    try std.testing.expectEqual(@as(u8, 0), buildModifiers(false, false, false, false, false));
    try std.testing.expectEqual(payloads.MOD_SHIFT | payloads.MOD_CTRL, buildModifiers(true, false, true, false, false));
    try std.testing.expectEqual(@as(u8, 0x1F), buildModifiers(true, true, true, true, true));
}

test "decodeCsiModifiers matches xterm modifier parameter" {
    const none = decodeCsiModifiers(1);
    try std.testing.expect(!none.shift and !none.alt and !none.ctrl);

    const shift = decodeCsiModifiers(2);
    try std.testing.expect(shift.shift and !shift.alt and !shift.ctrl);

    const alt = decodeCsiModifiers(3);
    try std.testing.expect(!alt.shift and alt.alt and !alt.ctrl);

    const shift_alt = decodeCsiModifiers(4);
    try std.testing.expect(shift_alt.shift and shift_alt.alt and !shift_alt.ctrl);

    const ctrl = decodeCsiModifiers(5);
    try std.testing.expect(!ctrl.shift and !ctrl.alt and ctrl.ctrl);

    const shift_ctrl = decodeCsiModifiers(6);
    try std.testing.expect(shift_ctrl.shift and !shift_ctrl.alt and shift_ctrl.ctrl);

    const alt_ctrl = decodeCsiModifiers(7);
    try std.testing.expect(!alt_ctrl.shift and alt_ctrl.alt and alt_ctrl.ctrl);

    const all = decodeCsiModifiers(8);
    try std.testing.expect(all.shift and all.alt and all.ctrl);
}

test "csi key tables decode final chars and ~ params" {
    try std.testing.expectEqual(CsiKey.ArrowUp, csiKeyFromFinalChar('A').?);
    try std.testing.expectEqual(CsiKey.End, csiKeyFromFinalChar('F').?);
    try std.testing.expectEqual(CsiKey.Tab, csiKeyFromFinalChar('Z').?);
    try std.testing.expect(csiKeyFromFinalChar('n') == null);

    try std.testing.expectEqual(CsiKey.Insert, csiKeyFromP1(2).?);
    try std.testing.expectEqual(CsiKey.PageUp, csiKeyFromP1(5).?);
    try std.testing.expectEqual(CsiKey.PageDown, csiKeyFromP1(6).?);
    try std.testing.expectEqual(CsiKey.F5, csiKeyFromP1(15).?);
    try std.testing.expectEqual(CsiKey.F15, csiKeyFromP1(27).?);
    try std.testing.expectEqual(CsiKey.F20, csiKeyFromP1(32).?);
    try std.testing.expect(csiKeyFromP1(99) == null);

    try std.testing.expectEqualStrings("ArrowUp", csiKeyName(.ArrowUp));
    try std.testing.expectEqualStrings("PageDown", csiKeyName(.PageDown));
    try std.testing.expectEqualStrings("F20", csiKeyName(.F20));
}

test "parseSs3Sequence emits F1 key" {
    event_bus.event_bus_setup();
    var _d: u64 = 0;
    defer event_bus.event_bus_stats(&_d);

    parseSs3Sequence("\x1bOP");
    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const modifiers = s.data[0];
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        try std.testing.expect(modifiers == 0);
        try std.testing.expectEqualStrings("F1", s.data[4 .. 4 + key_len]);
        event_bus.event_bus_commit();
    }
}

test "parseSgrMouseSequence emits mouse press" {
    event_bus.event_bus_setup();
    var _d: u64 = 0;
    defer event_bus.event_bus_stats(&_d);

    parseSgrMouseSequence("\x1b[<0;11;6M");
    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const flags = s.data[1];
        const button = s.data[2];
        const x = std.mem.readInt(u16, s.data[4..6], .little);
        const y = std.mem.readInt(u16, s.data[6..8], .little);
        try std.testing.expect((flags & payloads.HAS_BUTTON) != 0);
        try std.testing.expect((flags & payloads.IS_RELEASE) == 0);
        try std.testing.expectEqual(@as(u8, 0), button);
        try std.testing.expectEqual(@as(u16, 11), x);
        try std.testing.expectEqual(@as(u16, 6), y);
        event_bus.event_bus_commit();
    }
}

test "parseSgrMouseSequence emits mouse release" {
    event_bus.event_bus_setup();
    var _d: u64 = 0;
    defer event_bus.event_bus_stats(&_d);

    parseSgrMouseSequence("\x1b[<0;11;6m");
    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const flags = s.data[1];
        try std.testing.expect((flags & payloads.IS_RELEASE) != 0);
        event_bus.event_bus_commit();
    }
}

test "parseSgrMouseSequence maps shift modifier and drag buttons" {
    event_bus.event_bus_setup();
    var _d: u64 = 0;
    defer event_bus.event_bus_stats(&_d);

    parseSgrMouseSequence("\x1b[<32;11;6M");
    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const modifiers = s.data[0];
        const flags = s.data[1];
        const buttons = s.data[3];
        try std.testing.expect(modifiers == 0);
        try std.testing.expect((flags & payloads.HAS_BUTTONS) != 0);
        try std.testing.expectEqual(@as(u8, 1), buttons);
        event_bus.event_bus_commit();
    }
}

test "parseSgrMouseSequence emits wheel up with negative delta" {
    event_bus.event_bus_setup();
    var _d: u64 = 0;
    defer event_bus.event_bus_stats(&_d);

    parseSgrMouseSequence("\x1b[<64;11;6M");
    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const wheel_delta_y: i8 = @bitCast(s.data[8]);
        try std.testing.expectEqual(@as(i8, -1), wheel_delta_y);
        event_bus.event_bus_commit();
    }
}
