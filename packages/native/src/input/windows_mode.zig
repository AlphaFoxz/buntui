const std = @import("std");
const builtin = @import("builtin");
const logger = @import("../core/logger.zig");
const err = @import("../core/error.zig");
const windows = std.os.windows;

var original_outcp: windows.UINT = 0;

var current_windows_input_mode: windows.DWORD = 0;
comptime {
    if (builtin.os.tag != .windows) {
        @compileError("Unsupported OS: Not Windows");
    }
}

pub const WindowsInputModeValues = struct {
    // 由 ReadFile 或 ReadConsole 函数读取的字符在键入到控制台时，将被写入到活动屏幕缓冲区。
    // 只有同时启用了 ENABLE_LINE_INPUT 模式时，才能使用此模式。
    pub const ENABLE_ECHO_INPUT: std.os.windows.DWORD = 0x0004;
    // 如果启用，在控制台窗口中输入的文本将插入到当前光标位置，并且不会覆盖该位置后面的所有文本。
    // 如果禁用，则将覆盖后面的所有文本。
    pub const ENABLE_INSERT_MODE: std.os.windows.DWORD = 0x0020;
    // 仅当读取回车符时，才返回 ReadFile 或 ReadConsole 函数。
    // 如果禁用此模式，则将在有一个或多个字符可用时返回函数。
    pub const ENABLE_LINE_INPUT: std.os.windows.DWORD = 0x0002;
    // 如果鼠标指针位于控制台窗口的边框内并且窗口具有键盘焦点，则通过移动鼠标和按下按钮生成的鼠标事件会放置在输入缓冲区中。
    // 即使启用此模式，ReadFile 或 ReadConsole 也会丢弃这些事件。
    // ReadConsoleInput 函数可用于从输入缓冲区读取 MOUSE_EVENT 输入记录。
    pub const ENABLE_MOUSE_INPUT: std.os.windows.DWORD = 0x0010;
    // Ctrl+C 由系统处理，且不会放入输入缓冲区中。
    // 如果 ReadFile 或 ReadConsole 正在读取输入缓冲区，则其他控制键将由系统处理，且不会返回到 ReadFile 或 ReadConsole 缓冲区中。
    // 如果还启用了 ENABLE_LINE_INPUT 模式，则 Backspace、回车符和换行符将由系统处理。
    pub const ENABLE_PROCESSED_INPUT: std.os.windows.DWORD = 0x0001;
    // 用户可通过此标志使用鼠标选择和编辑文本。 要启用此模式，请使用 ENABLE_QUICK_EDIT_MODE | ENABLE_EXTENDED_FLAGS。
    // 要禁用此模式，请使用不带此标志的 ENABLE_EXTENDED_FLAGS。
    pub const ENABLE_QUICK_EDIT_MODE: std.os.windows.DWORD = 0x0040;
    // 更改控制台屏幕缓冲区大小的用户交互将记录到控制台的输入缓冲区中。
    // 使用 ReadConsoleInput 函数的应用程序可从输入缓冲区中读取有关这些事件的信息，但使用 ReadFile 或 ReadConsole 的应用程序无法读取这些事件。
    pub const ENABLE_WINDOW_INPUT: std.os.windows.DWORD = 0x0008;
    // 如果设置此标志，则会指导虚拟终端处理引擎将控制台窗口收到的用户输入转换为可由支持的应用程序通过 ReadFile 或 ReadConsole 函数检索的控制台虚拟终端序列。
    // 此标志通常与输出句柄上的 ENABLE_VIRTUAL_TERMINAL_PROCESSING 一起使用，以连接到只通过虚拟终端序列进行通信的应用程序。
    pub const ENABLE_VIRTUAL_TERMINAL_INPUT: std.os.windows.DWORD = 0x0200;
};

const WindowsOutputModeValues = struct {
    const ENABLE_PROCESSED_OUTPUT = 0x0001;
    const ENABLE_WRAP_AT_EOL_OUTPUT = 0x0002;
    const ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004;
    const DISABLE_NEWLINE_AUTO_RETURN = 0x0008;
    const ENABLE_LVB_GRID_WORLDWIDE = 0x0010;
};

pub const STD_HANDLE = enum(u32) {
    INPUT_HANDLE = 4294967286,
    OUTPUT_HANDLE = 4294967285,
    ERROR_HANDLE = 4294967284,
};

pub fn switchMouseInputMode() void {
    // const ENABLE_EXTENDED_FLAGS = 0x0080;
    // var new_mode: windows.DWORD = ENABLE_EXTENDED_FLAGS;
    var new_mode: windows.DWORD = 0;
    const stdin_handle = windows.kernel32.GetStdHandle(@intFromEnum(STD_HANDLE.INPUT_HANDLE)).?;
    // const stdout_handle = windows.kernel32.GetStdHandle(nSTD_OUTPUT_HANDLE).?;

    // new_mode |= WindowsInputModeValues.ENABLE_ECHO_INPUT;
    // new_mode |= WindowsInputModeValues.ENABLE_INSERT_MODE;
    // new_mode |= WindowsInputModeValues.ENABLE_LINE_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_MOUSE_INPUT;
    // new_mode |= WindowsInputModeValues.ENABLE_PROCESSED_INPUT;
    // new_mode |= WindowsInputModeValues.ENABLE_QUICK_EDIT_MODE;
    new_mode |= WindowsInputModeValues.ENABLE_WINDOW_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_VIRTUAL_TERMINAL_INPUT;
    // 设置控制台模式
    if (windows.kernel32.SetConsoleMode(stdin_handle, new_mode) == windows.FALSE) {
        err.osApiError("Failed to set console mode");
    }
    current_windows_input_mode = new_mode;
    logger.logInfo("Console switched to mouse mode");
}

pub fn switchDefaultInputMode() void {
    const stdin_handle = windows.kernel32.GetStdHandle(@intFromEnum(STD_HANDLE.INPUT_HANDLE)).?;
    // const stdout_handle = windows.kernel32.GetStdHandle(nSTD_OUTPUT_HANDLE).?;
    var new_mode: windows.DWORD = 0;
    new_mode |= WindowsInputModeValues.ENABLE_ECHO_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_INSERT_MODE;
    new_mode |= WindowsInputModeValues.ENABLE_LINE_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_MOUSE_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_PROCESSED_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_QUICK_EDIT_MODE;
    // new_mode |= WindowsInputModeValues.ENABLE_WINDOW_INPUT;
    // new_mode |= WindowsInputModeValues.ENABLE_VIRTUAL_TERMINAL_INPUT;
    if (windows.kernel32.SetConsoleMode(stdin_handle, new_mode) == windows.FALSE) {
        err.osApiError("Failed to set console mode");
    }
    current_windows_input_mode = new_mode;
    logger.logInfo("Console switched to default mode");
}

pub fn updateOutputCP2UTF8() void {
    original_outcp = std.os.windows.kernel32.GetConsoleOutputCP();
    if (std.os.windows.kernel32.SetConsoleOutputCP(65001) == windows.FALSE) {
        err.osApiError("Failed to set console output code page to UTF-8");
    }
}

pub fn restoreOutputCP() void {
    if (std.os.windows.kernel32.SetConsoleOutputCP(original_outcp) == windows.FALSE) {
        err.osApiError("Failed to restore console output code page to original value");
    }
}
