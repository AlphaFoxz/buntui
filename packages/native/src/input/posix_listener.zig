const std = @import("std");
const builtin = @import("builtin");
const logger = @import("../core/logger.zig");
const mode = @import("./posix_mode.zig");
const event_bus = @import("../core/event_bus.zig");
const payloads = @import("../core/event_payloads.zig");

comptime {
    switch (builtin.os.tag) {
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

const InputState = enum {
    Normal,
    EscReceived,
    CsiReceived,
    Ss3Received,
    Utf8Sequence,
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
                    emitKeyboardEvent(
                        buildModifiers(false, false, false, false, false),
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
                } else if (byte < 32) {
                    // Control character (Ctrl+A through Ctrl+Z, etc.)
                    var letter_buf = [_]u8{0};
                    letter_buf[0] = @as(u8, @intCast(byte + 0x40)); // Convert to uppercase letter
                    emitKeyboardEvent(
                        buildModifiers(false, false, true, false, false),
                        byte,
                        letter_buf[0..],
                    );
                } else if (byte == 127) {
                    // DEL key
                    emitKeyboardEvent(
                        buildModifiers(false, false, false, false, false),
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
                        emitKeyboardEvent(
                            buildModifiers(false, false, false, false, false),
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
                self.buffer[self.buf_idx] = byte;
                self.buf_idx += 1;

                if (byte == '[') {
                    self.state = .CsiReceived;
                } else if (byte == 'O') {
                    self.state = .Ss3Received;
                } else {
                    // Standalone ESC key
                    emitKeyboardEvent(self.pending_esc_modifiers, 0x1B, "Escape");
                    self.reset();
                }
            },
            .CsiReceived => {
                self.buffer[self.buf_idx] = byte;
                self.buf_idx += 1;

                if ((byte >= 'A' and byte <= 'Z') or (byte >= 'a' and byte <= 'z') or byte == '~') {
                    self.parseBufferedSequence();
                    self.reset();
                }
            },
            .Ss3Received => {
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

        const key_name: []const u8 = blk: {
            switch (final_char) {
                'A' => break :blk "ArrowUp",
                'B' => break :blk "ArrowDown",
                'C' => break :blk "ArrowRight",
                'D' => break :blk "ArrowLeft",
                'H' => break :blk "Home",
                'F' => break :blk "End",
                '~' => {
                    switch (param1) {
                        2 => break :blk "Insert",
                        3 => break :blk "Delete",
                        5 => break :blk "PageUp",
                        6 => break :blk "PageDown",
                        15 => break :blk "F5",
                        17 => break :blk "F6",
                        18 => break :blk "F7",
                        19 => break :blk "F8",
                        20 => break :blk "F9",
                        21 => break :blk "F10",
                        23 => break :blk "F11",
                        24 => break :blk "F12",
                        25 => break :blk "F13",
                        26 => break :blk "F14",
                        27 => break :blk "F15",
                        28 => break :blk "F16",
                        29 => break :blk "F17",
                        30 => break :blk "F18",
                        31 => break :blk "F19",
                        32 => break :blk "F20",
                        else => {
                            logger.logDebugFmt("其他 CSI~ 序列: {s}", .{seq});
                            break :blk "Unidentified";
                        },
                    }
                },
                else => {
                    logger.logDebugFmt("其他 CSI 序列: {s}", .{seq});
                    break :blk "Unidentified";
                },
            }
        };

        if (!std.mem.eql(u8, key_name, "Unidentified")) {
            logger.logDebugFmt("功能键: {s}", .{key_name});
            emitKeyboardEvent(
                buildModifiers(mod_shift, mod_alt, mod_ctrl, false, false),
                0,
                key_name,
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
        self.utf8_expected = 0;
        self.utf8_received = 0;
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
                emitResizeEvent(term_rows, term_cols);
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
