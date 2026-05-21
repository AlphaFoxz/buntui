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

extern "kernel32" fn GetStdHandle(nStdHandle: u32) callconv(.winapi) ?windows.HANDLE;
extern "kernel32" fn SetConsoleMode(hConsoleHandle: ?windows.HANDLE, dwMode: windows.DWORD) callconv(.winapi) windows.BOOL;
extern "kernel32" fn GetConsoleMode(hConsoleHandle: ?windows.HANDLE, lpMode: *windows.DWORD) callconv(.winapi) windows.BOOL;
extern "kernel32" fn GetConsoleOutputCP() callconv(.winapi) windows.UINT;
extern "kernel32" fn SetConsoleOutputCP(wCodePageID: windows.UINT) callconv(.winapi) windows.BOOL;
extern "kernel32" fn WriteFile(
    hFile: ?windows.HANDLE,
    lpBuffer: [*]const u8,
    nNumberOfBytesToWrite: u32,
    lpNumberOfBytesWritten: ?*u32,
    lpOverlapped: ?*anyopaque,
) callconv(.winapi) windows.BOOL;

pub const WindowsInputModeValues = struct {
    pub const ENABLE_ECHO_INPUT: std.os.windows.DWORD = 0x0004;
    pub const ENABLE_INSERT_MODE: std.os.windows.DWORD = 0x0020;
    pub const ENABLE_LINE_INPUT: std.os.windows.DWORD = 0x0002;
    pub const ENABLE_MOUSE_INPUT: std.os.windows.DWORD = 0x0010;
    pub const ENABLE_PROCESSED_INPUT: std.os.windows.DWORD = 0x0001;
    pub const ENABLE_QUICK_EDIT_MODE: std.os.windows.DWORD = 0x0040;
    pub const ENABLE_WINDOW_INPUT: std.os.windows.DWORD = 0x0008;
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

fn writeRawStdout(seq: []const u8) void {
    const stdout_handle = GetStdHandle(@intFromEnum(STD_HANDLE.OUTPUT_HANDLE)) orelse return;
    var written: u32 = 0;
    _ = WriteFile(stdout_handle, seq.ptr, @intCast(seq.len), &written, null);
}

fn enableOutputVtProcessing() void {
    const stdout_handle = GetStdHandle(@intFromEnum(STD_HANDLE.OUTPUT_HANDLE)) orelse return;
    var out_mode: windows.DWORD = 0;
    if (GetConsoleMode(stdout_handle, &out_mode) == .FALSE) return;
    if (out_mode & WindowsOutputModeValues.ENABLE_VIRTUAL_TERMINAL_PROCESSING != 0) return;
    out_mode |= WindowsOutputModeValues.ENABLE_VIRTUAL_TERMINAL_PROCESSING;
    _ = SetConsoleMode(stdout_handle, out_mode);
}

pub fn switchMouseInputMode() void {
    var new_mode: windows.DWORD = 0;
    const stdin_handle = GetStdHandle(@intFromEnum(STD_HANDLE.INPUT_HANDLE)).?;

    new_mode |= WindowsInputModeValues.ENABLE_MOUSE_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_WINDOW_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_VIRTUAL_TERMINAL_INPUT;

    if (SetConsoleMode(stdin_handle, new_mode) == .FALSE) {
        err.osApiError("Failed to set console mode");
    }
    current_windows_input_mode = new_mode;

    enableOutputVtProcessing();
    // Enable VT mouse tracking: any-event tracking + SGR extended format
    writeRawStdout("\x1b[?1003h\x1b[?1006h");
    logger.logInfo("Console switched to mouse mode");
}

pub fn switchDefaultInputMode() void {
    const stdin_handle = GetStdHandle(@intFromEnum(STD_HANDLE.INPUT_HANDLE)).?;

    // Disable VT mouse tracking before restoring console mode
    writeRawStdout("\x1b[?1003l\x1b[?1006l");

    var new_mode: windows.DWORD = 0;
    new_mode |= WindowsInputModeValues.ENABLE_ECHO_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_INSERT_MODE;
    new_mode |= WindowsInputModeValues.ENABLE_LINE_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_MOUSE_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_PROCESSED_INPUT;
    new_mode |= WindowsInputModeValues.ENABLE_QUICK_EDIT_MODE;
    if (SetConsoleMode(stdin_handle, new_mode) == .FALSE) {
        err.osApiError("Failed to set console mode");
    }
    current_windows_input_mode = new_mode;
    logger.logInfo("Console switched to default mode");
}

pub fn updateOutputCP2UTF8() void {
    original_outcp = GetConsoleOutputCP();
    if (SetConsoleOutputCP(65001) == .FALSE) {
        err.osApiError("Failed to set console output code page to UTF-8");
    }
}

pub fn restoreOutputCP() void {
    if (SetConsoleOutputCP(original_outcp) == .FALSE) {
        err.osApiError("Failed to restore console output code page to original value");
    }
}
