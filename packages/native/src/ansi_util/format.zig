const std = @import("std");
const testing = std.testing;
const CellStyle = @import("./style.zig").CellStyle;
const FontStyle = @import("./style.zig").FontStyle;
const Color = @import("./style.zig").Color;

const esc = "\x1B";
const csi = esc ++ "[";
const reset = csi ++ "0m";

const font_style_codes = std.StaticStringMap([]const u8).initComptime(.{
    .{ "bold", "1" },
    .{ "dim", "2" },
    .{ "italic", "3" },
    .{ "underline", "4" },
    .{ "slowblink", "5" },
    .{ "rapidblink", "6" },
    .{ "reverse", "7" },
    .{ "hidden", "8" },
    .{ "crossedout", "9" },
    .{ "fraktur", "20" },
    .{ "overline", "53" },
});

/// Update the current style of the ANSI terminal
///
/// Optionally accepts the previous style active on the
/// terminal. Using this information, the function will update only
/// the attributes which are new in order to minimize the amount
/// written.
///
/// Tries to use as little bytes as necessary. Use this function if
/// you want to optimize for smallest amount of transmitted bytes
/// instead of computation speed.
pub fn updateStyle(writer: anytype, n_style: CellStyle, o_style: ?CellStyle) !void {
    if (o_style) |o| if (n_style.eql(o)) return;
    if (n_style.isDefault()) return try resetStyle(writer);

    // A reset is required if the new font style has attributes not
    // present in the old style or if the old style is not known
    const reset_required = if (o_style) |sty| !sty.font_style.subsetOf(n_style.font_style) else true;
    if (reset_required) try resetStyle(writer);

    // Start the escape sequence
    try writer.writeAll(csi);
    var written_something = false;

    // Font styles
    const write_styles = if (reset_required) n_style.font_style else n_style.font_style.without(o_style.?.font_style);
    inline for (std.meta.fields(FontStyle)) |field| {
        if (@field(write_styles, field.name)) {
            const code = font_style_codes.get(field.name).?;
            if (written_something) {
                try writer.writeAll(";");
            } else {
                written_something = true;
            }
            try writer.writeAll(code);
        }
    }

    // Foreground color
    if (reset_required and
        n_style.foreground != .Default or
        o_style != null and
            !o_style.?.foreground.eql(n_style.foreground))
    {
        if (written_something) {
            try writer.writeAll(";");
        } else {
            written_something = true;
        }

        switch (n_style.foreground) {
            .Default => try writer.writeAll("39"),
            .Black => try writer.writeAll("30"),
            .Red => try writer.writeAll("31"),
            .Green => try writer.writeAll("32"),
            .Yellow => try writer.writeAll("33"),
            .Blue => try writer.writeAll("34"),
            .Magenta => try writer.writeAll("35"),
            .Cyan => try writer.writeAll("36"),
            .White => try writer.writeAll("37"),
            .Fixed => |fixed| try writer.print("38;5;{}", .{fixed.value}),
            .Grey => |grey| try writer.print("38;2;{};{};{}", .{ grey.value, grey.value, grey.value }),
            .Rgba => |rgb| try writer.print("38;2;{};{};{}", .{ rgb.r, rgb.g, rgb.b }),
        }
    }

    // Background color
    if (reset_required and n_style.background != .Default or o_style != null and !o_style.?.background.eql(n_style.background)) {
        if (written_something) {
            try writer.writeAll(";");
        } else {
            written_something = true;
        }

        switch (n_style.background) {
            .Default => try writer.writeAll("49"),
            .Black => try writer.writeAll("40"),
            .Red => try writer.writeAll("41"),
            .Green => try writer.writeAll("42"),
            .Yellow => try writer.writeAll("43"),
            .Blue => try writer.writeAll("44"),
            .Magenta => try writer.writeAll("45"),
            .Cyan => try writer.writeAll("46"),
            .White => try writer.writeAll("47"),
            .Fixed => |fixed| try writer.print("48;5;{}", .{fixed.value}),
            .Grey => |grey| try writer.print("48;2;{};{};{}", .{ grey.value, grey.value, grey.value }),
            .Rgba => |rgb| try writer.print("48;2;{};{};{}", .{ rgb.r, rgb.g, rgb.b }),
        }
    }

    // End the escape sequence
    try writer.writeAll("m");
}

pub fn updateStyleAndFlush(writer: anytype, new: CellStyle, old: ?CellStyle) !void {
    try updateStyle(writer, new, old);
    try writer.flush();
}

test "same style default, no update" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try updateStyle(&fw, CellStyle{}, CellStyle{});

    const expected = "";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "same style non-default, no update" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    const sty = CellStyle{
        .foreground = Color.Green,
    };
    try updateStyle(&fw, sty, sty);

    const expected = "";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "reset to default, old null" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try updateStyle(&fw, CellStyle{}, null);

    const expected = "\x1B[0m";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "reset to default, old non-null" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try updateStyle(&fw, CellStyle{}, CellStyle{
        .font_style = .{ .bold = true },
    });

    const expected = "\x1B[0m";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "bold style" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try updateStyle(&fw, CellStyle{
        .font_style = .{ .bold = true },
    }, CellStyle{});

    const expected = "\x1B[1m";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "add bold style" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try updateStyle(&fw, CellStyle{
        .font_style = .{ .bold = true, .italic = true },
    }, CellStyle{
        .font_style = .{ .italic = true },
    });

    const expected = "\x1B[1m";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "reset required font style" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try updateStyle(&fw, CellStyle{
        .font_style = .{ .bold = true },
    }, CellStyle{
        .font_style = .{ .bold = true, .underline = true },
    });

    const expected = "\x1B[0m\x1B[1m";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "reset required color style" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try updateStyle(&fw, CellStyle{
        .foreground = Color.Red,
    }, null);

    const expected = "\x1B[0m\x1B[31m";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "no reset required color style" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try updateStyle(&fw, CellStyle{
        .foreground = Color.Red,
    }, CellStyle{});

    const expected = "\x1B[31m";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "no reset required add color style" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try updateStyle(&fw, CellStyle{
        .foreground = Color.Red,
        .background = Color.Magenta,
    }, CellStyle{
        .background = Color.Magenta,
    });

    const expected = "\x1B[31m";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

pub fn resetStyle(writer: anytype) !void {
    try writer.writeAll(reset);
}

pub fn resetStyleAndFlush(writer: anytype) !void {
    try resetStyle(writer);
    try writer.flush();
}

test "reset style" {
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);

    try resetStyle(&fw);

    const expected = "\x1B[0m";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "Grey foreground color" {
    const GrayColor = @import("./style.zig").GrayColor;
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    var new_style = CellStyle{};
    new_style.foreground = Color{ .Grey = GrayColor{ .value = 1 } };

    try updateStyle(&fw, new_style, CellStyle{});

    const expected = "\x1B[38;2;1;1;1m";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}

test "Grey background color" {
    const GrayColor = @import("./style.zig").GrayColor;
    var buf: [1024]u8 = undefined;
    var fw = std.Io.Writer.fixed(&buf);
    var new_style = CellStyle{};
    new_style.background = Color{ .Grey = GrayColor{ .value = 1 } };

    try updateStyle(&fw, new_style, CellStyle{});

    const expected = "\x1B[48;2;1;1;1m";
    const actual = fw.buffer[0..fw.end];

    try testing.expectEqualSlices(u8, expected, actual);
}
