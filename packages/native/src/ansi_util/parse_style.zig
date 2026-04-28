const std = @import("std");
const expect = std.testing.expect;
const expectEqual = std.testing.expectEqual;

const style = @import("style.zig");
const CellStyle = style.CellStyle;
const FontStyle = style.FontStyle;
const Color = style.Color;
const FixedColor = style.FixedColor;

const ParseState = enum {
    parse_8,
    parse_fg_non_8,
    parse_fg_256,
    parse_fg_red,
    parse_fg_green,
    parse_fg_blue,
    parse_bg_non_8,
    parse_bg_256,
    parse_bg_red,
    parse_bg_green,
    parse_bg_blue,
};

/// Parses an ANSI escape sequence into a Style. Returns null when the
/// string does not represent a valid style description
pub fn parseStyle(code: []const u8) ?CellStyle {
    if (code.len == 0 or std.mem.eql(u8, code, "0") or std.mem.eql(u8, code, "00")) {
        return null;
    }

    var font_style = FontStyle{};
    var foreground: Color = .Default;
    var background: Color = .Default;

    var state = ParseState.parse_8;
    var red: u8 = 0;
    var green: u8 = 0;

    var iter = std.mem.splitScalar(u8, code, ';');
    while (iter.next()) |str| {
        const part = std.fmt.parseInt(u8, str, 10) catch return null;

        switch (state) {
            .parse_8 => {
                switch (part) {
                    0 => font_style = FontStyle{},
                    1 => font_style.bold = true,
                    2 => font_style.dim = true,
                    3 => font_style.italic = true,
                    4 => font_style.underline = true,
                    5 => font_style.slowblink = true,
                    6 => font_style.rapidblink = true,
                    7 => font_style.reverse = true,
                    8 => font_style.hidden = true,
                    9 => font_style.crossedout = true,
                    20 => font_style.fraktur = true,
                    30 => foreground = Color.Black,
                    31 => foreground = Color.Red,
                    32 => foreground = Color.Green,
                    33 => foreground = Color.Yellow,
                    34 => foreground = Color.Blue,
                    35 => foreground = Color.Magenta,
                    36 => foreground = Color.Cyan,
                    37 => foreground = Color.White,
                    38 => state = ParseState.parse_fg_non_8,
                    39 => foreground = Color.Default,
                    40 => background = Color.Black,
                    41 => background = Color.Red,
                    42 => background = Color.Green,
                    43 => background = Color.Yellow,
                    44 => background = Color.Blue,
                    45 => background = Color.Magenta,
                    46 => background = Color.Cyan,
                    47 => background = Color.White,
                    48 => state = ParseState.parse_bg_non_8,
                    49 => background = Color.Default,
                    53 => font_style.overline = true,
                    else => {
                        return null;
                    },
                }
            },
            .parse_fg_non_8 => {
                switch (part) {
                    5 => state = ParseState.parse_fg_256,
                    2 => state = ParseState.parse_fg_red,
                    else => {
                        return null;
                    },
                }
            },
            .parse_fg_256 => {
                foreground = .{ .Fixed = .{ .value = part } };
                state = ParseState.parse_8;
            },
            .parse_fg_red => {
                red = part;
                state = ParseState.parse_fg_green;
            },
            .parse_fg_green => {
                green = part;
                state = ParseState.parse_fg_blue;
            },
            .parse_fg_blue => {
                foreground = .{
                    .Rgba = .{
                        .r = red,
                        .g = green,
                        .b = part,
                        .a = 0xFF,
                    },
                };
                state = ParseState.parse_8;
            },
            .parse_bg_non_8 => {
                switch (part) {
                    5 => state = ParseState.parse_bg_256,
                    2 => state = ParseState.parse_bg_red,
                    else => {
                        return null;
                    },
                }
            },
            .parse_bg_256 => {
                background = .{ .Fixed = .{ .value = part } };
                state = ParseState.parse_8;
            },
            .parse_bg_red => {
                red = part;
                state = ParseState.parse_bg_green;
            },
            .parse_bg_green => {
                green = part;
                state = ParseState.parse_bg_blue;
            },
            .parse_bg_blue => {
                background = .{
                    .Rgba = .{
                        .r = red,
                        .g = green,
                        .b = part,
                        .a = 0xFF,
                    },
                };
                state = ParseState.parse_8;
            },
        }
    }

    if (state != ParseState.parse_8)
        return null;

    return .{
        .foreground = foreground,
        .background = background,
        .font_style = font_style,
    };
}

test "parse empty style" {
    try expectEqual(@as(?CellStyle, null), parseStyle(""));
    try expectEqual(@as(?CellStyle, null), parseStyle("0"));
    try expectEqual(@as(?CellStyle, null), parseStyle("00"));
}

test "parse bold style" {
    const actual = parseStyle("01");
    const expected = CellStyle{
        .font_style = .{ .bold = true },
    };

    try expectEqual(@as(?CellStyle, expected), actual);
}

test "parse yellow style" {
    const actual = parseStyle("33");
    const expected = CellStyle{
        .foreground = Color.Yellow,

        .font_style = .{},
    };

    try expectEqual(@as(?CellStyle, expected), actual);
}

test "parse some fixed color" {
    const actual = parseStyle("38;5;220;1");
    const expected = CellStyle{
        .foreground = Color{ .Fixed = FixedColor{ .value = 220 } },

        .font_style = .{ .bold = true },
    };

    try expectEqual(@as(?CellStyle, expected), actual);
}

test "parse some rgb color" {
    const actual = parseStyle("38;2;123;123;123;1");
    const expected = CellStyle{
        .foreground = Color{ .Rgba = .{
            .r = 123,
            .g = 123,
            .b = 123,
            .a = 0xFF,
        } },

        .font_style = .{ .bold = true },
    };

    try expectEqual(@as(?CellStyle, expected), actual);
}

test "parse wrong rgb color" {
    const actual = parseStyle("38;2;123");
    try expectEqual(@as(?CellStyle, null), actual);
}
