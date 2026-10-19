const std = @import("std");
const builtin = @import("builtin");
const logger = @import("../core/logger.zig");
const mode = @import("./posix_mode.zig");
const event_bus = @import("../core/event_bus.zig");
const payloads = @import("../core/event_payloads.zig");
const normalize = @import("./normalize.zig");

comptime {
    switch (builtin.target.os.tag) {
        .linux, .macos, .freebsd, .netbsd, .openbsd => {},
        else => @compileError("Unsupported OS: Not a POSIX system"),
    }
}

var thread: std.Thread = undefined;
var thread_started: bool = false;
var should_stop = std.atomic.Value(bool).init(false);
var resize_signaled = std.atomic.Value(bool).init(false);

// Terminal size tracking
var term_rows: u16 = 24;
var term_cols: u16 = 80;

const Parser = struct {
    state: normalize.InputState = .Normal,
    buffer: [64]u8 = undefined,
    buf_idx: usize = 0,
    pending_esc_modifiers: u8 = 0,
    pending_alt: bool = false,
    // UTF-8 sequence tracking
    utf8_buffer: [4]u8 = undefined,
    utf8_expected: u8 = 0,
    utf8_received: u8 = 0,

    pub fn processByte(self: *Parser, byte: u8) void {
        switch (self.state) {
            .Normal => {
                if (byte == 0x1B) {
                    // Start of escape sequence
                    self.pending_esc_modifiers = 0;
                    self.state = .EscReceived;
                    self.buf_idx = 0;
                    self.buffer[self.buf_idx] = byte;
                    self.buf_idx += 1;
                } else if (byte >= 32 and byte < 127) {
                    // ASCII printable character (1 byte)
                    var char_buf: [4]u8 = undefined;
                    const char_len = std.unicode.utf8Encode(@as(u21, byte), &char_buf) catch 0;
                    normalize.emitKeyboardEvent(
                        normalize.buildModifiers(false, false, false, false, false),
                        byte,
                        char_buf[0..char_len],
                    );
                } else if (byte >= 128) {
                    // UTF-8 multi-byte character start
                    // 110xxxxx (0xC0-0xDF): 2 bytes
                    // 1110xxxx (0xE0-0xEF): 3 bytes
                    // 11110xxx (0xF0-0xF7): 4 bytes
                    const byte_count: u8 = if (byte >= 0xF0) 4 else if (byte >= 0xE0) 3 else if (byte >= 0xC0) 2 else 1;

                    self.utf8_buffer[0] = byte;
                    self.utf8_expected = byte_count;
                    self.utf8_received = 1;
                    self.state = .Utf8Sequence;
                } else if (byte == 0x09) {
                    normalize.emitKeyboardEvent(
                        normalize.buildModifiers(false, false, false, false, false),
                        byte,
                        "Tab",
                    );
                } else if (byte == 0x0D) {
                    normalize.emitKeyboardEvent(
                        normalize.buildModifiers(false, false, false, false, false),
                        byte,
                        "Enter",
                    );
                } else if (byte == 0x0A) {
                    normalize.emitKeyboardEvent(
                        normalize.buildModifiers(false, false, true, false, false),
                        byte,
                        "Enter",
                    );
                } else if (byte == 0x08 or byte == 0x7F) {
                    normalize.emitKeyboardEvent(
                        normalize.buildModifiers(false, false, false, false, false),
                        byte,
                        "Backspace",
                    );
                } else if (byte < 32) {
                    // Control character (Ctrl+A through Ctrl+Z, etc.)
                    var letter_buf = [_]u8{0};
                    letter_buf[0] = @as(u8, @intCast(byte + 0x60)); // Convert to lowercase letter (ctrlKey=true, shiftKey=false)
                    normalize.emitKeyboardEvent(
                        normalize.buildModifiers(false, false, true, false, false),
                        byte,
                        letter_buf[0..],
                    );
                } else if (byte == 127) {
                    // DEL key
                    normalize.emitKeyboardEvent(
                        normalize.buildModifiers(false, false, false, false, false),
                        byte,
                        "Delete",
                    );
                }
            },
            .Utf8Sequence => {
                // Collect UTF-8 continuation bytes (10xxxxxx)
                if (byte >= 128 and byte < 192) {
                    self.utf8_buffer[self.utf8_received] = byte;
                    self.utf8_received += 1;

                    if (self.utf8_received == self.utf8_expected) {
                        // Complete UTF-8 sequence received
                        // Decode the UTF-8 sequence to get the code point
                        const codepoint = std.unicode.utf8Decode(self.utf8_buffer[0..self.utf8_expected]) catch 0xFFFD;

                        // Emit keyboard event with the full UTF-8 sequence
                        normalize.emitKeyboardEvent(
                            normalize.buildModifiers(false, self.pending_alt, false, false, false),
                            @intCast(codepoint),
                            self.utf8_buffer[0..self.utf8_expected],
                        );

                        self.reset();
                    }
                } else {
                    // Invalid UTF-8 continuation byte, treat as error
                    // Reset and let the byte be processed in normal state
                    self.reset();
                    self.processByte(byte);
                }
            },
            .EscReceived => {
                if (self.buf_idx >= self.buffer.len) {
                    // Sequence too long — emit the buffered ESC and restart
                    self.reset();
                    self.processByte(byte);
                    return;
                }
                self.buffer[self.buf_idx] = byte;
                self.buf_idx += 1;

                if (byte == '[') {
                    self.state = .CsiReceived;
                } else if (byte == 'O') {
                    self.state = .Ss3Received;
                } else if (byte >= 32 and byte < 127) {
                    // Alt + printable ASCII
                    var char_buf: [4]u8 = undefined;
                    const char_len = std.unicode.utf8Encode(@as(u21, byte), &char_buf) catch 0;
                    normalize.emitKeyboardEvent(
                        normalize.buildModifiers(false, true, false, false, false),
                        byte,
                        char_buf[0..char_len],
                    );
                    self.reset();
                } else if (byte > 0 and byte < 32) {
                    // Alt + Ctrl + letter
                    var letter_buf = [_]u8{0};
                    letter_buf[0] = @as(u8, @intCast(byte + 0x40));
                    normalize.emitKeyboardEvent(
                        normalize.buildModifiers(false, true, true, false, false),
                        byte,
                        letter_buf[0..],
                    );
                    self.reset();
                } else if (byte >= 128) {
                    // Alt + UTF-8: collect multi-byte sequence
                    const byte_count: u8 = if (byte >= 0xF0) 4 else if (byte >= 0xE0) 3 else if (byte >= 0xC0) 2 else 1;
                    self.utf8_buffer[0] = byte;
                    self.utf8_expected = byte_count;
                    self.utf8_received = 1;
                    self.pending_alt = true;
                    self.state = .Utf8Sequence;
                } else {
                    normalize.emitKeyboardEvent(self.pending_esc_modifiers, 0x1B, "Escape");
                    self.reset();
                }
            },
            .CsiReceived => {
                if (self.buf_idx >= self.buffer.len) {
                    // CSI sequence exceeds buffer — drop it and restart parsing
                    self.reset();
                    self.processByte(byte);
                    return;
                }
                self.buffer[self.buf_idx] = byte;
                self.buf_idx += 1;

                if ((byte >= 'A' and byte <= 'Z') or (byte >= 'a' and byte <= 'z') or byte == '~') {
                    self.parseBufferedSequence();
                    self.reset();
                }
            },
            .Ss3Received => {
                if (self.buf_idx >= self.buffer.len) {
                    // SS3 sequence exceeds buffer — drop it and restart parsing
                    self.reset();
                    self.processByte(byte);
                    return;
                }
                self.buffer[self.buf_idx] = byte;
                self.buf_idx += 1;
                if (self.buf_idx == 3) {
                    self.parseBufferedSequence();
                    self.reset();
                }
            },
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

        // Split params into individual values
        var param_buf: [8]u16 = @splat(0);
        var param_count: usize = 0;
        if (params.len > 0) {
            var iter = std.mem.splitScalar(u8, params, ';');
            while (iter.next()) |p| {
                if (param_count >= param_buf.len) break;
                param_buf[param_count] = std.fmt.parseInt(u16, p, 10) catch 0;
                param_count += 1;
            }
        }

        // Decode modifier from a CSI param value (1=none, 2=shift, 3=alt, 4=shift+alt, 5=ctrl, etc.)
        const decodeModifiers = normalize.decodeCsiModifiers;

        // Format 2: \e[KEY;MODu  (xterm modifyOtherKeys format with 'u' terminator)
        if (final_char == 'u' and param_count >= 2) {
            const key_code = param_buf[0];
            const mods = decodeModifiers(param_buf[1]);
            const kn = normalize.keyCodeToKeyName(key_code);
            if (!std.mem.eql(u8, kn, "Unidentified")) {
                logger.logDebugFmt("modifyOtherKeys(u): {s}", .{kn});
                normalize.emitKeyboardEvent(
                    normalize.buildModifiers(mods.shift, mods.alt, mods.ctrl, false, false),
                    key_code,
                    kn,
                );
            }
            return;
        }

        // Format 1: \e[27;MOD;KEY~  (xterm modifyOtherKeys format with '~' terminator)
        if (final_char == '~' and param_count >= 3 and param_buf[0] == 27) {
            const mods = decodeModifiers(param_buf[1]);
            const key_code = param_buf[2];
            const kn = normalize.keyCodeToKeyName(key_code);
            if (!std.mem.eql(u8, kn, "Unidentified")) {
                logger.logDebugFmt("modifyOtherKeys(~): {s}", .{kn});
                normalize.emitKeyboardEvent(
                    normalize.buildModifiers(mods.shift, mods.alt, mods.ctrl, false, false),
                    key_code,
                    kn,
                );
            }
            return;
        }

        // Standard CSI parsing (arrow keys, function keys, etc.)
        const param1: u16 = if (param_count > 0) param_buf[0] else 0;
        var mod_shift: bool = false;
        var mod_alt: bool = false;
        var mod_ctrl: bool = false;
        if (param_count >= 2) {
            const mods = decodeModifiers(param_buf[1]);
            mod_shift = mods.shift;
            mod_alt = mods.alt;
            mod_ctrl = mods.ctrl;
        }

        var key_name: []const u8 = "Unidentified";
        if (final_char == '~') {
            if (normalize.csiKeyFromP1(param1)) |key| {
                key_name = normalize.csiKeyName(key);
            } else {
                logger.logDebugFmt("其他 CSI~ 序列: {s}", .{seq});
            }
        } else if (normalize.csiKeyFromFinalChar(final_char)) |key| {
            if (key == .Tab and final_char == 'Z') {
                mod_shift = true;
            }
            key_name = normalize.csiKeyName(key);
        } else {
            logger.logDebugFmt("其他 CSI 序列: {s}", .{seq});
        }

        if (!std.mem.eql(u8, key_name, "Unidentified")) {
            logger.logDebugFmt("功能键: {s}", .{key_name});
            normalize.emitKeyboardEvent(
                normalize.buildModifiers(mod_shift, mod_alt, mod_ctrl, false, false),
                0,
                key_name,
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
        self.utf8_expected = 0;
        self.utf8_received = 0;
        self.pending_alt = false;
    }
};

// SIGWINCH signal handler for terminal resize
fn sigwinchHandler(signo: std.posix.SIG) callconv(.c) void {
    _ = signo;
    resize_signaled.store(true, .release);
}

fn getTerminalSize() !struct { rows: u16, cols: u16 } {
    const stdin_handle = std.posix.STDIN_FILENO;
    var size: std.posix.winsize = undefined;

    const rc = std.posix.system.ioctl(stdin_handle, std.posix.T.IOCGWINSZ, @intFromPtr(&size));
    if (rc != 0) {
        return error.IoctlFailed;
    }

    return .{
        .rows = size.row,
        .cols = size.col,
    };
}

fn checkAndEmitResize() void {
    if (resize_signaled.load(.acquire)) {
        resize_signaled.store(false, .release);

        if (getTerminalSize()) |size| {
            // Only emit if size actually changed
            if (size.rows != term_rows or size.cols != term_cols) {
                term_rows = size.rows;
                term_cols = size.cols;
                normalize.emitResizeEvent(term_rows, term_cols);
                logger.logInfoFmt("终端调整大小: {}x{}", .{ term_cols, term_rows });
            }
        } else |e| {
            logger.logErrorFmt("获取终端大小失败: {}", .{e});
        }
    }
}

fn listen() void {
    logger.logInfo("input listener starting...");

    const stdin_handle = std.posix.STDIN_FILENO;

    // Set up SIGWINCH handler using sigaction
    const act = std.posix.Sigaction{
        .handler = .{ .handler = sigwinchHandler },
        .mask = std.posix.sigemptyset(),
        .flags = 0,
    };

    std.posix.sigaction(std.posix.SIG.WINCH, &act, null);

    // Get initial terminal size
    if (getTerminalSize()) |size| {
        term_rows = size.rows;
        term_cols = size.cols;
    } else |_| {
        // Use defaults if we can't get size
        term_rows = 24;
        term_cols = 80;
    }

    mode.switchMouseInputMode();

    var parser = Parser{};
    var read_buffer: [256]u8 = undefined;

    while (!should_stop.load(.acquire)) {
        // Check for terminal resize
        checkAndEmitResize();

        // Set up poll for stdin with timeout
        var fds: [1]std.posix.pollfd = .{
            .{
                .fd = stdin_handle,
                .events = std.posix.POLL.IN,
                .revents = 0,
            },
        };

        // Poll with 16ms timeout (similar to Windows)
        const poll_result = std.posix.poll(&fds, 16) catch |err| {
            logger.logErrorFmt("poll() failed: {}", .{err});
            return;
        };

        if (poll_result == 0) {
            // Timeout, flush any pending ESC key
            parser.flushPendingEsc();
            continue;
        }

        if (fds[0].revents & std.posix.POLL.IN != 0) {
            // Data available to read
            const bytes_read = std.posix.read(stdin_handle, &read_buffer) catch |err| {
                logger.logErrorFmt("read() failed: {}", .{err});
                return;
            };

            if (bytes_read == 0) {
                // EOF, stdin closed
                logger.logInfo("stdin closed, stopping listener");
                return;
            }

            // Process each byte
            for (read_buffer[0..bytes_read]) |byte| {
                parser.processByte(byte);
            }
        }

        if (logger.current_log_level == logger.LOG_LEVEL_DEBUG) {
            logger.flush();
        }
    }

    // Restore default terminal mode
    mode.switchDefaultInputMode();
}

pub fn start() void {
    if (!thread_started) {
        thread = std.Thread.spawn(.{}, listen, .{}) catch |e| {
            logger.logErrorFmt("Failed to start input listener: {}", .{e});
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

test "Parser: Tab byte 0x09 produces key Tab" {
    event_bus.event_bus_setup();
    defer {
        var _d: u64 = 0;
        event_bus.event_bus_stats(&_d);
    }

    var parser: Parser = .{};
    parser.processByte(0x09);

    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const modifiers = s.data[0];
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expect(modifiers == 0);
        try std.testing.expectEqualStrings("Tab", key);
        event_bus.event_bus_commit();
    }
}

test "Parser: Enter byte 0x0D produces key Enter" {
    event_bus.event_bus_setup();
    defer {
        var _d: u64 = 0;
        event_bus.event_bus_stats(&_d);
    }

    var parser: Parser = .{};
    parser.processByte(0x0D);

    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const modifiers = s.data[0];
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expect(modifiers == 0);
        try std.testing.expectEqualStrings("Enter", key);
        event_bus.event_bus_commit();
    }
}

test "Parser: Backspace byte 0x08 produces key Backspace" {
    event_bus.event_bus_setup();
    defer {
        var _d: u64 = 0;
        event_bus.event_bus_stats(&_d);
    }

    var parser: Parser = .{};
    parser.processByte(0x08);

    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expectEqualStrings("Backspace", key);
        event_bus.event_bus_commit();
    }
}

test "Parser: Ctrl+letter (0x01-0x07) produces Ctrl modifier" {
    event_bus.event_bus_setup();
    defer {
        var _d: u64 = 0;
        event_bus.event_bus_stats(&_d);
    }

    var parser: Parser = .{};
    // Ctrl+A = 0x01
    parser.processByte(0x01);

    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const modifiers = s.data[0];
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expect(modifiers & payloads.MOD_CTRL != 0);
        try std.testing.expectEqualStrings("a", key);
        event_bus.event_bus_commit();
    }
}

test "Parser: raw 0x0A (LF) is recognized as Ctrl+Enter, not Ctrl+J" {
    event_bus.event_bus_setup();
    defer {
        var _d: u64 = 0;
        event_bus.event_bus_stats(&_d);
    }

    var parser: Parser = .{};
    // 0x0A = LF. Intercepted before Ctrl+letter handler so Ctrl+Enter
    // is not misidentified as Ctrl+J. Real Ctrl+J arrives via modifyOtherKeys.
    parser.processByte(0x0A);

    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const modifiers = s.data[0];
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expect(modifiers & payloads.MOD_CTRL != 0);
        try std.testing.expectEqualStrings("Enter", key);
        event_bus.event_bus_commit();
    }
}

test "Parser: modifyOtherKeys format 2 (u terminator) Ctrl+I" {
    event_bus.event_bus_setup();
    defer {
        var _d: u64 = 0;
        event_bus.event_bus_stats(&_d);
    }

    var parser: Parser = .{};
    // \e[105;5u = Ctrl+I via modifyOtherKeys format 2
    const seq = "\x1b[105;5u";
    for (seq) |byte| {
        parser.processByte(byte);
    }

    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const modifiers = s.data[0];
        const char_code = std.mem.readInt(u16, s.data[1..3], .little);
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expect(modifiers & payloads.MOD_CTRL != 0);
        try std.testing.expect(char_code == 105); // 'i' ASCII code
        try std.testing.expectEqualStrings("i", key);
        event_bus.event_bus_commit();
    }
}

test "Parser: modifyOtherKeys format 1 (~ terminator) Ctrl+I" {
    event_bus.event_bus_setup();
    defer {
        var _d: u64 = 0;
        event_bus.event_bus_stats(&_d);
    }

    var parser: Parser = .{};
    // \e[27;5;105~ = Ctrl+I via modifyOtherKeys format 1
    const seq = "\x1b[27;5;105~";
    for (seq) |byte| {
        parser.processByte(byte);
    }

    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const modifiers = s.data[0];
        const char_code = std.mem.readInt(u16, s.data[1..3], .little);
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expect(modifiers & payloads.MOD_CTRL != 0);
        try std.testing.expect(char_code == 105);
        try std.testing.expectEqualStrings("i", key);
        event_bus.event_bus_commit();
    }
}

test "Parser: modifyOtherKeys Ctrl+Shift+I" {
    event_bus.event_bus_setup();
    defer {
        var _d: u64 = 0;
        event_bus.event_bus_stats(&_d);
    }

    var parser: Parser = .{};
    // \e[105;6u = Ctrl+Shift+I
    const seq = "\x1b[105;6u";
    for (seq) |byte| {
        parser.processByte(byte);
    }

    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const modifiers = s.data[0];
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expect(modifiers & payloads.MOD_CTRL != 0);
        try std.testing.expect(modifiers & payloads.MOD_SHIFT != 0);
        try std.testing.expectEqualStrings("i", key);
        event_bus.event_bus_commit();
    }
}

test "Parser: modifyOtherKeys Alt+Enter" {
    event_bus.event_bus_setup();
    defer {
        var _d: u64 = 0;
        event_bus.event_bus_stats(&_d);
    }

    var parser: Parser = .{};
    // \e[13;3u = Alt+Enter
    const seq = "\x1b[13;3u";
    for (seq) |byte| {
        parser.processByte(byte);
    }

    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const modifiers = s.data[0];
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expect(modifiers & payloads.MOD_ALT != 0);
        try std.testing.expectEqualStrings("Enter", key);
        event_bus.event_bus_commit();
    }
}

test "Parser: Tab (0x09) and Ctrl+I (modifyOtherKeys) are distinct" {
    event_bus.event_bus_setup();
    defer {
        var _d: u64 = 0;
        event_bus.event_bus_stats(&_d);
    }

    var parser: Parser = .{};

    // First: raw Tab byte
    parser.processByte(0x09);
    const tab_slot = event_bus.event_bus_poll();
    try std.testing.expect(tab_slot != null);
    if (tab_slot) |s| {
        const modifiers = s.data[0];
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expect(modifiers == 0); // No modifiers for Tab
        try std.testing.expectEqualStrings("Tab", key);
        event_bus.event_bus_commit();
    }

    // Second: Ctrl+I via modifyOtherKeys
    const seq = "\x1b[105;5u";
    for (seq) |byte| {
        parser.processByte(byte);
    }
    const ctrl_i_slot = event_bus.event_bus_poll();
    try std.testing.expect(ctrl_i_slot != null);
    if (ctrl_i_slot) |s| {
        const modifiers = s.data[0];
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expect(modifiers & payloads.MOD_CTRL != 0); // Ctrl modifier
        try std.testing.expectEqualStrings("i", key); // 'i' not 'Tab'
        event_bus.event_bus_commit();
    }
}

test "Parser: standard CSI arrow keys still work" {
    event_bus.event_bus_setup();
    defer {
        var _d: u64 = 0;
        event_bus.event_bus_stats(&_d);
    }

    var parser: Parser = .{};
    // \e[A = ArrowUp
    const seq = "\x1b[A";
    for (seq) |byte| {
        parser.processByte(byte);
    }

    const slot = event_bus.event_bus_poll();
    try std.testing.expect(slot != null);
    if (slot) |s| {
        const modifiers = s.data[0];
        const key_len: u8 = @intCast(@min(s.data[3], 236));
        const key = s.data[4 .. 4 + key_len];
        try std.testing.expect(modifiers == 0);
        try std.testing.expectEqualStrings("ArrowUp", key);
        event_bus.event_bus_commit();
    }
}
