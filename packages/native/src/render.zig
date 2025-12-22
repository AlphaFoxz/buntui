const builtin = @import("builtin");
const std = @import("std");
const Io = std.Io;
const glo_alloc = @import("./core/glo_alloc.zig");
const std_io = @import("./core/std_io.zig");
const ansi = @import("./ansi_util.zig");
const string = @import("./core/string.zig");
const logger = @import("./core/logger.zig");

const TuiContext = @import("./core/tui_context.zig").TuiContext;

pub fn renderFrame(tui_context: *TuiContext) void {
    // 1. 设置 UTF-8 编码（Windows）
    const writer: *Io.Writer = &std_io.writer.interface;
    const is_windows = @import("builtin").os.tag == .windows;
    if (is_windows) {
        setWindowsUTF8() catch {};
    }
    var bg_rgba = ansi.style.Rgba{
        .r = 0x7F,
        .g = 0x60,
        .b = 0xFE,
        .a = 0x7F,
    };
    bg_rgba.alphaBlending(ansi.style.Rgba{
        .r = 0x00,
        .g = 0x00,
        .b = 0x00,
        .a = 0xFF,
    });
    ansi.format.updateStyle(writer, ansi.style.CellStyle{
        .background = ansi.style.Color{
            .Rgba = bg_rgba,
        },
        .foreground = .{ .Rgba = ansi.style.BuiltinRgbaColor.White },
    }, null) catch {
        logger.logError("Failed to update style");
    };

    // const str = string.String.initFromSclice("你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿你好⊿");
    const str = string.String.initFromSclice(
        "Hello world 你好⊿ " ++ "― " ++ "= " ++ "○ " ++ "× \n" ++
            "Hello world 你好⊿ ↙ ↓ △ ↗ ↑ ✖ ║ ══ ――",
    );
    defer str.deinit();
    var iter = str.iter();

    var compute_col: u16 = 0;
    for (0..tui_context.rows) |row| {
        compute_col = 0;
        var should_skip: u16 = 0;
        for (0..tui_context.cols) |col| {
            if (should_skip > 0) {
                should_skip -= 1;
                continue;
            }
            var peeked = iter.next();
            if (peeked == null) {
                ansi.writeAllToPos(writer, col, row, " ") catch unreachable;
                continue;
            } else if (peeked.?.len == 1 and peeked.?[0] == '\n') {
                peeked = " ";
            }
            const char_len: u16 = @intCast(string.getDisplayWidthStd(peeked.?));
            should_skip = char_len - 1;
            compute_col += char_len;
            logger.logDebugFmt("字符: {s}, 长度: {}", .{ peeked.?, char_len });
            ansi.writeAllToPos(writer, col, row, peeked.?) catch unreachable;
        }
    }
    ansi.cursor.setCursor(writer, 0, 0) catch unreachable;
    ansi.terminal.setTitle(writer, "term-bed") catch unreachable;
    writer.flush() catch unreachable;
}

var next_char: []const u8 = "1";
fn nextChar() []const u8 {
    next_char = if (std.mem.eql(u8, next_char, "1")) "你" else "1";
    return next_char;
}
fn previewNextChar() []const u8 {
    return if (std.mem.eql(u8, next_char, "1")) "你" else "1";
}

fn setWindowsUTF8() !void {
    if (@import("builtin").os.tag != .windows) return;

    const windows = std.os.windows;
    const kernel32 = windows.kernel32;

    // 设置控制台输出代码页为 UTF-8 (65001)
    _ = kernel32.SetConsoleOutputCP(65001);
    // _ = kernel32.SetConsoleCP(65001);
}
