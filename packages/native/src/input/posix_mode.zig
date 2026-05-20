const std = @import("std");
const builtin = @import("builtin");
const logger = @import("../core/logger.zig");
const err = @import("../core/error.zig");

comptime {
    switch (builtin.os.tag) {
        .linux, .macos, .freebsd, .netbsd, .openbsd => {},
        else => @compileError("Unsupported OS: Not Linux, MacOS, FreeBSD, NetBSD, OpenBSD"),
    }
}

var original_termios: std.posix.termios = undefined;
var original_termios_saved: bool = false;

pub const STD_HANDLE = enum(u32) {
    INPUT_HANDLE = std.posix.STDIN_FILENO,
    OUTPUT_HANDLE = std.posix.STDOUT_FILENO,
    ERROR_HANDLE = std.posix.STDERR_FILENO,
};

fn writeRawStdout(seq: []const u8) void {
    const stdout_handle = std.posix.STDOUT_FILENO;
    const result = std.posix.system.write(stdout_handle, seq.ptr, seq.len);
    _ = result;
}

fn enableOutputVtProcessing() void {
    // POSIX terminals already support ANSI escape sequences by default
    // No special mode switching needed like on Windows
}

fn saveOriginalTermios() void {
    if (!original_termios_saved) {
        const stdin_handle = std.posix.STDIN_FILENO;
        original_termios = std.posix.tcgetattr(stdin_handle) catch |e| {
            err.osApiErrorFmt("Failed to get original terminal attributes: {}", .{e});
            return;
        };
        original_termios_saved = true;
        logger.logInfo("Original terminal attributes saved");
    }
}

pub fn switchMouseInputMode() void {
    const stdin_handle = std.posix.STDIN_FILENO;

    // Save original termios if not already saved
    saveOriginalTermios();

    // Get current terminal attributes
    var termios = std.posix.tcgetattr(stdin_handle) catch |e| {
        err.osApiErrorFmt("Failed to get terminal attributes: {}", .{e});
        return;
    };

    // Disable canonical mode - don't wait for Enter
    termios.lflag.ICANON = false;
    // Disable echo
    termios.lflag.ECHO = false;
    // Disable signal character processing (Ctrl+C, Ctrl+Z, etc.)
    termios.lflag.ISIG = false;
    // Disable input processing
    termios.iflag.IXON = false; // Disable XON/XOFF flow control
    termios.iflag.ICRNL = false; // Disable CR to NL conversion
    termios.iflag.BRKINT = false; // Disable break signal
    termios.iflag.INPCK = false; // Disable parity checking
    termios.iflag.ISTRIP = false; // Disable 8th bit stripping
    // Disable output processing
    termios.oflag.OPOST = false;
    // Set character size to 8 bits
    termios.cflag.CSIZE = .CS8;

    // Set minimum read characters and timeout
    termios.cc[@intFromEnum(std.posix.V.MIN)] = 0; // Non-blocking read
    termios.cc[@intFromEnum(std.posix.V.TIME)] = 0; // No timeout

    // Apply settings (take effect immediately)
    std.posix.tcsetattr(stdin_handle, .NOW, termios) catch |e| {
        err.osApiErrorFmt("Failed to set terminal attributes: {}", .{e});
        return;
    };

    enableOutputVtProcessing();
    // Enable VT mouse tracking: any-event tracking + SGR extended format
    writeRawStdout("\x1b[?1003h\x1b[?1006h");
    logger.logInfo("Terminal switched to mouse mode");
}

pub fn switchDefaultInputMode() void {
    const stdin_handle = std.posix.STDIN_FILENO;

    // Disable VT mouse tracking before restoring terminal mode
    writeRawStdout("\x1b[?1003l\x1b[?1006l");

    if (original_termios_saved) {
        // Restore original terminal attributes
        std.posix.tcsetattr(stdin_handle, .NOW, original_termios) catch |e| {
            err.osApiErrorFmt("Failed to restore terminal attributes: {}", .{e});
            return;
        };
        logger.logInfo("Terminal switched to default mode");
    } else {
        // If we don't have original attributes, set to a safe default
        var termios = std.posix.tcgetattr(stdin_handle) catch |e| {
            err.osApiErrorFmt("Failed to get terminal attributes: {}", .{e});
            return;
        };

        // Restore to normal mode
        termios.lflag.ICANON = true;
        termios.lflag.ECHO = true;
        termios.lflag.ISIG = true;
        termios.iflag.IXON = true;
        termios.iflag.ICRNL = true;
        termios.oflag.OPOST = true;

        std.posix.tcsetattr(stdin_handle, .NOW, termios) catch |e| {
            err.osApiErrorFmt("Failed to restore terminal attributes: {}", .{e});
            return;
        };
        logger.logInfo("Terminal switched to default mode (safe defaults)");
    }
}

// Stub functions for Windows-specific code page handling
// POSIX systems use UTF-8 by default, so no conversion needed
pub fn updateOutputCP2UTF8() void {
    // POSIX systems don't need code page conversion
    // They use UTF-8 by default
}

pub fn restoreOutputCP() void {
    // POSIX systems don't need code page conversion
    // They use UTF-8 by default
}
