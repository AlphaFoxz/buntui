const std = @import("std");
const builtin = @import("builtin");

comptime {
    switch (builtin.os.tag) {
        .linux, .macos, .freebsd, .netbsd, .openbsd => {},
        else => @compileError("Unsupported OS: Not Linux, MacOS, FreeBSD, NetBSD, OpenBSD"),
    }
}

// Stub functions for Windows-specific code page handling
pub fn updateOutputCP2UTF8() void {
    // POSIX systems don't need code page conversion
}

pub fn restoreOutputCP() void {
    // POSIX systems don't need code page conversion
}

// Public functions for mode switching
pub fn switchMouseInputMode() void {
    // Mouse input mode is handled by the terminal
    setAppModePosix(true) catch unreachable;
}

pub fn switchDefaultInputMode() void {
    setAppModePosix(false) catch unreachable;
}

fn setAppModePosix(enable: bool) !void {
    const stdin_handle = std.posix.STDIN_FILENO;

    // 获取当前终端属性
    var termios = try std.posix.tcgetattr(stdin_handle);

    if (enable) {
        // 禁用规范模式 - 不等待回车
        termios.lflag.ICANON = false;
        // 禁用回显
        termios.lflag.ECHO = false;
        // 禁用信号字符处理 (Ctrl+C, Ctrl+Z 等)
        termios.lflag.ISIG = false;
        // 禁用输入处理
        termios.iflag.IXON = false; // 禁用 XON/XOFF 流控制
        termios.iflag.ICRNL = false; // 禁用 CR 转 NL
        termios.iflag.BRKINT = false; // 禁用 break 信号
        termios.iflag.INPCK = false; // 禁用奇偶校验
        termios.iflag.ISTRIP = false; // 禁用第8位剥离
        // 禁用输出处理
        termios.oflag.OPOST = false;
        // 设置字符大小为8位
        termios.cflag.CSIZE = .CS8;

        // 设置最小读取字符数和超时
        termios.cc[@intFromEnum(std.posix.V.MIN)] = 0; // 非阻塞读取
        termios.cc[@intFromEnum(std.posix.V.TIME)] = 0; // 无超时
    } else {
        // 恢复为正常模式
        termios.lflag.ICANON = true;
        termios.lflag.ECHO = true;
        termios.lflag.ISIG = true;
        termios.iflag.IXON = true;
        termios.iflag.ICRNL = true;
        termios.oflag.OPOST = true;
    }

    // 应用设置 (立即生效)
    try std.posix.tcsetattr(stdin_handle, .NOW, termios);
}
