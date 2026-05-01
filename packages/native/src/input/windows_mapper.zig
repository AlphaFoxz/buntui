const std = @import("std");
const builtin = @import("builtin");

comptime {
    if (builtin.os.tag != .windows) {
        @compileError("Unsupported OS: Not Windows");
    }
}

// Alt
pub const VK_MENU = 0x12;
pub const VK_LMENU = 0xA4;
pub const VK_RMENU = 0xA5;
// CapsLock
pub const VK_CAPITAL = 0x14;
// Control
pub const VK_CONTROL = 0x11;
pub const VK_LCONTROL = 0xA2;
pub const VK_RCONTROL = 0xA3;
// Meta
pub const VK_LWIN = 0x5B;
pub const VK_RWIN = 0x5C;
// Shift
pub const VK_SHIFT = 0x10;
pub const VK_LSHIFT = 0xA0;
pub const VK_RSHIFT = 0xA1;
// Enter
pub const VK_RETURN = 0x0D;
// Tab
pub const VK_TAB = 0x09;
// Space
pub const VK_SPACE = 0x20;
// ArrowDown
pub const VK_DOWN = 0x28;
// ArrowLeft
pub const VK_LEFT = 0x25;
// ArrowRight
pub const VK_RIGHT = 0x27;
// ArrowUp
pub const VK_UP = 0x26;
// End
pub const VK_END = 0x23;
// Home
pub const VK_HOME = 0x24;
// PageDown
pub const VK_NEXT = 0x22;
// PageUp
pub const VK_PRIOR = 0x21;
// Backspace
pub const VK_BACK = 0x08;
// Clear
pub const VK_CLEAR = 0x0C;
pub const VK_OEM_CLEAR = 0xFE;
// Delete
pub const VK_DELETE = 0x2E;
// Insert
pub const VK_INSERT = 0x2D;
// ContextMenu
pub const VK_APPS = 0x5D;
// Escape
pub const VK_ESCAPE = 0x1B;
// Help
pub const VK_HELP = 0x2F;
// KanjiMode
// pub const VK_KANJI = ?;
// F1
pub const VK_F1 = 0x70;
// F2
pub const VK_F2 = 0x71;
// F3
pub const VK_F3 = 0x72;
// F4
pub const VK_F4 = 0x73;
// F5
pub const VK_F5 = 0x74;
// F6
pub const VK_F6 = 0x75;
// F7
pub const VK_F7 = 0x76;
// F8
pub const VK_F8 = 0x77;
// F9
pub const VK_F9 = 0x78;
// F10
pub const VK_F10 = 0x79;
// F11
pub const VK_F11 = 0x7A;
// F12
pub const VK_F12 = 0x7B;
// F13
pub const VK_F13 = 0x7C;
// F14
pub const VK_F14 = 0x7D;
// F15
pub const VK_F15 = 0x7E;
// F16
pub const VK_F16 = 0x7F;
// F17
pub const VK_F17 = 0x80;
// F18
pub const VK_F18 = 0x81;
// F19
pub const VK_F19 = 0x82;
// F20
pub const VK_F20 = 0x83;
// AudioVolumeDown
pub const VK_VOLUME_DOWN = 0xAE;
// AudioVolumeMute
pub const VK_VOLUME_MUTE = 0xAD;
// AudioVolumeUp
pub const VK_VOLUME_UP = 0xAF;
// Decimal
pub const VK_DECIMAL = 0x6E;
// Multiply
pub const VK_MULTIPLY = 0x6A;
// Add
pub const VK_ADD = 0x6B;
// Divide
pub const VK_DIVIDE = 0x6F;
// Subtract
pub const VK_SUBTRACT = 0x6D;
// Separator
pub const VK_SEPARATOR = 0x6C;
// 0
pub const VK_NUMPAD0 = 0x60;
// 1
pub const VK_NUMPAD1 = 0x61;
// 2
pub const VK_NUMPAD2 = 0x62;
// 3
pub const VK_NUMPAD3 = 0x63;
// 4
pub const VK_NUMPAD4 = 0x64;
// 5
pub const VK_NUMPAD5 = 0x65;
// 6
pub const VK_NUMPAD6 = 0x66;
// 7
pub const VK_NUMPAD7 = 0x67;
// 8
pub const VK_NUMPAD8 = 0x68;
// 9
pub const VK_NUMPAD9 = 0x69;

pub const WindowsVirtualKeyCodes = enum(u16) {
    Unidentified = 0x00,
    Alt = 0x01,
    CapsLock = 0x02,
    Control = 0x03,
    Meta = 0x04,
};

const VirtualKeyPair = struct {
    virtual_key: u16,
    name: []const u8,
};

// See https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
const raw_mappings = [_]VirtualKeyPair{
    VirtualKeyPair{ .virtual_key = VK_MENU, .name = "Alt" },
    VirtualKeyPair{ .virtual_key = VK_LMENU, .name = "Alt" },
    VirtualKeyPair{ .virtual_key = VK_RMENU, .name = "Alt" },
    VirtualKeyPair{ .virtual_key = VK_CAPITAL, .name = "CapsLock" },
    VirtualKeyPair{ .virtual_key = VK_CONTROL, .name = "Control" },
    VirtualKeyPair{ .virtual_key = VK_LCONTROL, .name = "Control" },
    VirtualKeyPair{ .virtual_key = VK_RCONTROL, .name = "Control" },
    VirtualKeyPair{ .virtual_key = VK_LWIN, .name = "Meta" },
    VirtualKeyPair{ .virtual_key = VK_RWIN, .name = "Meta" },
    VirtualKeyPair{ .virtual_key = VK_SHIFT, .name = "Shift" },
    VirtualKeyPair{ .virtual_key = VK_LSHIFT, .name = "Shift" },
    VirtualKeyPair{ .virtual_key = VK_RSHIFT, .name = "Shift" },
    VirtualKeyPair{ .virtual_key = VK_RETURN, .name = "Enter" },
    VirtualKeyPair{ .virtual_key = VK_TAB, .name = "Tab" },
    VirtualKeyPair{ .virtual_key = VK_SPACE, .name = " " },
    VirtualKeyPair{ .virtual_key = VK_DOWN, .name = "ArrowDown" },
    VirtualKeyPair{ .virtual_key = VK_LEFT, .name = "ArrowLeft" },
    VirtualKeyPair{ .virtual_key = VK_RIGHT, .name = "ArrowRight" },
    VirtualKeyPair{ .virtual_key = VK_UP, .name = "ArrowUp" },
    VirtualKeyPair{ .virtual_key = VK_END, .name = "End" },
    VirtualKeyPair{ .virtual_key = VK_HOME, .name = "Home" },
    VirtualKeyPair{ .virtual_key = VK_NEXT, .name = "PageDown" },
    VirtualKeyPair{ .virtual_key = VK_PRIOR, .name = "PageUp" },
    VirtualKeyPair{ .virtual_key = VK_BACK, .name = "Backspace" },
    VirtualKeyPair{ .virtual_key = VK_CLEAR, .name = "Clear" },
    VirtualKeyPair{ .virtual_key = VK_OEM_CLEAR, .name = "Clear" },
    VirtualKeyPair{ .virtual_key = VK_DELETE, .name = "Delete" },
    VirtualKeyPair{ .virtual_key = VK_INSERT, .name = "Insert" },
    VirtualKeyPair{ .virtual_key = VK_APPS, .name = "ContextMenu" },
    VirtualKeyPair{ .virtual_key = VK_ESCAPE, .name = "Escape" },
    VirtualKeyPair{ .virtual_key = VK_HELP, .name = "Help" },
    VirtualKeyPair{ .virtual_key = VK_F1, .name = "F1" },
    VirtualKeyPair{ .virtual_key = VK_F2, .name = "F2" },
    VirtualKeyPair{ .virtual_key = VK_F3, .name = "F3" },
    VirtualKeyPair{ .virtual_key = VK_F4, .name = "F4" },
    VirtualKeyPair{ .virtual_key = VK_F5, .name = "F5" },
    VirtualKeyPair{ .virtual_key = VK_F6, .name = "F6" },
    VirtualKeyPair{ .virtual_key = VK_F7, .name = "F7" },
    VirtualKeyPair{ .virtual_key = VK_F8, .name = "F8" },
    VirtualKeyPair{ .virtual_key = VK_F9, .name = "F9" },
    VirtualKeyPair{ .virtual_key = VK_F10, .name = "F10" },
    VirtualKeyPair{ .virtual_key = VK_F11, .name = "F11" },
    VirtualKeyPair{ .virtual_key = VK_F12, .name = "F12" },
    VirtualKeyPair{ .virtual_key = VK_F13, .name = "F13" },
    VirtualKeyPair{ .virtual_key = VK_F14, .name = "F14" },
    VirtualKeyPair{ .virtual_key = VK_F15, .name = "F15" },
    VirtualKeyPair{ .virtual_key = VK_F16, .name = "F16" },
    VirtualKeyPair{ .virtual_key = VK_F17, .name = "F17" },
    VirtualKeyPair{ .virtual_key = VK_F18, .name = "F18" },
    VirtualKeyPair{ .virtual_key = VK_F19, .name = "F19" },
    VirtualKeyPair{ .virtual_key = VK_F20, .name = "F20" },
    VirtualKeyPair{ .virtual_key = VK_VOLUME_DOWN, .name = "AudioVolumeDown" },
    VirtualKeyPair{ .virtual_key = VK_VOLUME_MUTE, .name = "AudioVolumeMute" },
    VirtualKeyPair{ .virtual_key = VK_VOLUME_UP, .name = "AudioVolumeUp" },
    VirtualKeyPair{ .virtual_key = VK_DECIMAL, .name = "." },
    VirtualKeyPair{ .virtual_key = VK_MULTIPLY, .name = "*" },
    VirtualKeyPair{ .virtual_key = VK_ADD, .name = "+" },
    VirtualKeyPair{ .virtual_key = VK_DIVIDE, .name = "/" },
    VirtualKeyPair{ .virtual_key = VK_SUBTRACT, .name = "-" },
    VirtualKeyPair{ .virtual_key = VK_SEPARATOR, .name = "." },
    VirtualKeyPair{ .virtual_key = VK_NUMPAD0, .name = "0" },
    VirtualKeyPair{ .virtual_key = VK_NUMPAD1, .name = "1" },
    VirtualKeyPair{ .virtual_key = VK_NUMPAD2, .name = "2" },
    VirtualKeyPair{ .virtual_key = VK_NUMPAD3, .name = "3" },
    VirtualKeyPair{ .virtual_key = VK_NUMPAD4, .name = "4" },
    VirtualKeyPair{ .virtual_key = VK_NUMPAD5, .name = "5" },
    VirtualKeyPair{ .virtual_key = VK_NUMPAD6, .name = "6" },
    VirtualKeyPair{ .virtual_key = VK_NUMPAD7, .name = "7" },
    VirtualKeyPair{ .virtual_key = VK_NUMPAD8, .name = "8" },
    VirtualKeyPair{ .virtual_key = VK_NUMPAD9, .name = "9" },
};
const VirtualKeyMap = blk: {
    @setEvalBranchQuota(10000);
    // 1. 复制一份数据以便修改
    var data = raw_mappings;

    // 2. 在编译期定义排序函数
    const sortFn = struct {
        fn lessThan(_: void, a: VirtualKeyPair, b: VirtualKeyPair) bool {
            return a.virtual_key < b.virtual_key;
        }
    }.lessThan;

    // 3. 执行编译期排序
    std.sort.block(VirtualKeyPair, &data, {}, sortFn);

    // 4. 返回包含数据的匿名结构体，作为一个 Namespace 使用
    break :blk struct {
        // 将排序后的数据固化为常量
        const sorted_data = data;

        /// 运行时查询函数
        pub fn get(key: u16) ?[]const u8 { // 假设返回类型是 ?[]const u8 { // 假设返回类型也是 u16
            const result = std.sort.binarySearch(VirtualKeyPair, &sorted_data, key, struct {
                fn order(k: u16, item: VirtualKeyPair) std.math.Order {
                    // 注意：这里应该和上面排序用的字段保持一致，使用 virtual_key
                    return std.math.order(k, item.virtual_key);
                }
            }.order);

            if (result) |index| {
                // 这里也要确认字段名，假设值存储在 'scancode' 或 'val' 字段中？
                // 根据上下文可能是 item.val 或 item.scancode
                return sorted_data[index].name;
            }
            return null;
        }
    };
};

pub fn mapVirtualKeyName(virtual_key: u16) ?[]const u8 {
    return VirtualKeyMap.get(virtual_key);
}

pub fn unicodeToKeyName(unicode: u16) []const u8 {
    switch (unicode) {
        0x08 => return "Backspace",
        0x0D => return "Enter",
        0x1B => return "Escape",
        0x20 => return " ",
        0x7F => return "Backspace",
        else => return "Unidentified",
    }
}
