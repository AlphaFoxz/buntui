const std = @import("std");
const meta = std.meta;
const testing = std.testing;

pub const Rgba = packed struct {
    a: u8,
    b: u8,
    g: u8,
    r: u8,

    pub fn toU32(self: Rgba) u32 {
        return @bitCast(self);
    }
    pub fn eql(self: Rgba, other: Rgba) bool {
        return self.toU32() == other.toU32();
    }
    pub fn fromU32(bits: u32) Rgba {
        return @bitCast(bits);
    }
    /// See https://en.wikipedia.org/wiki/Alpha_compositing
    pub fn alphaCompositing(self: *Rgba, under: Rgba) void {
        if (under.a == 0xFF) {
            return self.alphaBlending(under);
        }
        if (self.a == 0xFF) {
            return;
        }

        if (self.a == 0) {
            self.r = under.r;
            self.g = under.g;
            self.b = under.b;
            self.a = under.a;
            return;
        }

        // 3. 快速路径：如果下层(under)完全透明，无需混合
        if (under.a == 0) return;

        const src_a: u32 = self.a;
        const inv_src_a: u32 = 0xFF - src_a;
        const dst_a: u32 = under.a;

        // out_a = src_a + da * (1 - src_a)
        // out_a_scaled = out_a * 255
        const dst_weight_255 = dst_a * inv_src_a; // range: 0..255*255
        const out_a_scaled = src_a * 255 + dst_weight_255;

        if (out_a_scaled == 0) {
            self.* = .{ .r = 0, .g = 0, .b = 0, .a = 0 };
            return;
        }

        // Out = (Src * src_a + Dst * dst_a * (1-src_a)) / out_a
        // Out = (Src * src_a * 255 + Dst * (dst_a * inv_src_a)) / (out_a * 255)

        const r_num = @as(u32, self.r) * src_a * 255 + @as(u32, under.r) * dst_weight_255;
        const g_num = @as(u32, self.g) * src_a * 255 + @as(u32, under.g) * dst_weight_255;
        const b_num = @as(u32, self.b) * src_a * 255 + @as(u32, under.b) * dst_weight_255;

        self.r = @intCast(r_num / out_a_scaled);
        self.g = @intCast(g_num / out_a_scaled);
        self.b = @intCast(b_num / out_a_scaled);
        self.a = @intCast(out_a_scaled / 255);
    }
    /// See https://en.wikipedia.org/wiki/Alpha_compositing
    pub fn alphaBlending(self: *Rgba, under: Rgba) void {
        if (self.a == 0xFF) return;

        const src_a: u32 = self.a;
        const inv_src_a: u32 = 0xFF - src_a;

        self.r = div255(@as(u32, self.r) * src_a + @as(u32, under.r) * inv_src_a);
        self.g = div255(@as(u32, self.g) * src_a + @as(u32, under.g) * inv_src_a);
        self.b = div255(@as(u32, self.b) * src_a + @as(u32, under.b) * inv_src_a);
        self.a = 0xFF;
    }
    inline fn div255(x: u32) u8 {
        return @intCast((x + 127) / 255);
    }
};

test "Rgba and u32" {
    const white = Rgba{ .r = 0, .g = 0, .b = 0, .a = 0xFF };
    try testing.expect(white.toU32() == 0xFF);

    const red = Rgba.fromU32(0xFF0000FF);
    const same_red = Rgba{ .r = 0xFF, .g = 0, .b = 0, .a = 0xFF };
    try testing.expectEqual(red.toU32(), same_red.toU32());
    try testing.expect(red == same_red);
    try testing.expect(meta.eql(red, same_red));
    try testing.expect(red.eql(same_red));
}

test "Rgba alpha compositing" {
    const layer_top = Rgba.fromU32(0xFF00007F); // Red 50%
    const layer_mid = Rgba.fromU32(0x00FF007F); // Green 50%
    const layer_bot = Rgba.fromU32(0x000000FF); // Black 100%

    var mixed = Rgba.fromU32(0);

    mixed.alphaCompositing(layer_top);
    try std.testing.expectEqual(layer_top.r, mixed.r);
    try std.testing.expectEqual(layer_top.a, mixed.a); // 此时 Alpha 应该是 127，而不是 255

    mixed.alphaCompositing(layer_mid);
    // Alpha = 127 + 127 * (1 - 0.5) ≈ 190
    try std.testing.expect(mixed.a > 127 and mixed.a < 255);

    mixed.alphaCompositing(layer_bot);

    try std.testing.expect(mixed.r >= 126 and mixed.r <= 128); // 127 ± 1
    try std.testing.expect(mixed.g >= 62 and mixed.g <= 64); // 63 ± 1
    try std.testing.expectEqual(@as(u8, 0x00), mixed.b); // 0
    try std.testing.expectEqual(@as(u8, 0xFF), mixed.a); // 255
}

test "Rgba alpha blending" {
    const layer_top = Rgba.fromU32(0xFF00007F); // Red 50%
    const layer_bot = Rgba.fromU32(0x00FF00FF); // Green 100%

    var mixed = Rgba.fromU32(layer_top.toU32());

    mixed.alphaBlending(layer_bot);
    try std.testing.expectEqual(mixed.toU32(), 0x7F8000FF);
}

pub const GrayColor = packed struct {
    value: u8,

    pub fn toU32(self: GrayColor) u32 {
        const val = @as(u32, self.value);
        return val << 24 | val << 16 | val << 8 | 0xFF;
    }
    pub fn eql(self: GrayColor, other: GrayColor) bool {
        return self.value == other.value;
    }
};

const STANDARD_COLORS = [_]u32{
    0x000000FF, // 0: Black
    0x800000FF, // 1: Red
    0x008000FF, // 2: Green
    0x808000FF, // 3: Yellow
    0x000080FF, // 4: Blue
    0x800080FF, // 5: Magenta
    0x008080FF, // 6: Cyan
    0xc0c0c0FF, // 7: White (Light Grey)
    0x808080FF, // 8: Bright Black (Grey)
    0xff0000FF, // 9: Bright Red
    0x00ff00FF, // 10: Bright Green
    0xffff00FF, // 11: Bright Yellow
    0x0000ffFF, // 12: Bright Blue
    0xff00ffFF, // 13: Bright Magenta
    0x00ffffFF, // 14: Bright Cyan
    0xffffffFF, // 15: Bright White
};
pub const FixedColor = packed struct {
    value: u8,

    pub fn toRgba(self: FixedColor) Rgba {
        return Rgba.fromU32(self.toU32());
    }
    pub fn toU32(self: FixedColor) u32 {
        const fixed = self.value;
        // 1. 标准色 (0-15)
        // 使用 XTerm 默认配色值
        if (fixed < 16) {
            return STANDARD_COLORS[fixed];
        }

        // 2. 灰度阶梯 (232-255)
        // 范围从 0x08 到 0xEE，步长为 10
        if (fixed >= 232) {
            const v: u32 = @intCast((fixed - 232) * 10 + 8);
            const result: u32 = 0;
            return result | v << 24 | v << 16 | v << 8 | 0xFF;
        }

        // 3. 6x6x6 颜色立方体 (16-231)
        // 公式: index = 16 + 36*r + 6*g + b
        // r, g, b 范围是 0-5
        var val = fixed - 16;

        const b_idx = val % 6;
        val /= 6;
        const g_idx = val % 6;
        val /= 6;
        const r_idx = val; // 剩余的就是 r (val % 6 也可以)

        // 映射函数: 0->0, 1-5 -> (idx * 40 + 55)
        // 对应值: 0, 95, 135, 175, 215, 255
        return mapCubeValues(r_idx, g_idx, b_idx);
    }
    pub fn eql(self: GrayColor, other: anytype) bool {
        return self.toU32() == other.toU32();
    }
    // 辅助函数：将 0-5 的立方体索引映射为 0-255 的颜色值
    inline fn mapCubeValue(val: u8) u8 {
        if (val == 0) return 0;
        return val * 40 + 55;
    }
    inline fn mapCubeValues(r: u8, g: u8, b: u8) u32 {
        const result: u32 = 0;
        return result | @as(u32, r) * 40 + 55 << 24 | @as(u32, g) * 40 + 55 << 16 | @as(u32, b) * 40 + 55 << 8 | 0xFF;
    }
};

pub const BuiltinRgbaColor = struct {
    pub const Black = Rgba{ .r = 0x00, .g = 0x00, .b = 0x00, .a = 0xFF };
    pub const Red = Rgba{ .r = 0xFF, .g = 0x00, .b = 0x00, .a = 0xFF };
    pub const Green = Rgba{ .r = 0x00, .g = 0xFF, .b = 0x00, .a = 0xFF };
    pub const Yellow = Rgba{ .r = 0xFF, .g = 0xFF, .b = 0x00, .a = 0xFF };
    pub const Blue = Rgba{ .r = 0x00, .g = 0x00, .b = 0xFF, .a = 0xFF };
    pub const Magenta = Rgba{ .r = 0xFF, .g = 0x00, .b = 0xFF, .a = 0xFF };
    pub const Cyan = Rgba{ .r = 0x00, .g = 0xFF, .b = 0xFF, .a = 0xFF };
    pub const White = Rgba{ .r = 0xFF, .g = 0xFF, .b = 0xFF, .a = 0xFF };
    pub const Grey = Rgba{ .r = 0x7F, .g = 0x7F, .b = 0x7F, .a = 0xFF };
};

pub const Color = union(enum) {
    Default,
    Black,
    Red,
    Green,
    Yellow,
    Blue,
    Magenta,
    Cyan,
    White,
    Fixed: FixedColor,
    Grey: GrayColor,
    Rgba: Rgba,

    pub fn eql(self: Color, other: Color) bool {
        const Tag = std.meta.Tag(Color);
        const s_tag: Tag = self; // 自动转换获取 tag
        const o_tag: Tag = other;
        if (s_tag == o_tag) {
            return switch (self) {
                .Fixed => |v| v == other.Fixed,
                .Grey => |v| v == other.Grey,
                .Rgba => |v| @as(u32, @bitCast(v)) == @as(u32, @bitCast(other.Rgba)),
                // 对于 Default, Black 等没有负载的标签，Tag 相同即相等
                else => true,
            };
        }
        if (isValueColor(s_tag) and isValueColor(o_tag)) {
            return self.toU32() == other.toU32();
        }
        return false;
    }

    inline fn isValueColor(tag: std.meta.Tag(Color)) bool {
        return switch (tag) {
            .Fixed, .Grey, .Rgba => true,
            .Default, .Black, .Red, .Green, .Yellow, .Blue, .Magenta, .Cyan, .White => false,
        };
    }
    inline fn toU32(self: Color) u32 {
        return switch (self) {
            .Fixed => |v| v.toU32(),
            .Grey => |v| v.toU32(),
            .Rgba => |v| v.toU32(),
            else => 0,
        };
    }
};

pub const FontStyle = packed struct {
    bold: bool = false,
    dim: bool = false,
    italic: bool = false,
    underline: bool = false,
    slowblink: bool = false,
    rapidblink: bool = false,
    reverse: bool = false,
    hidden: bool = false,
    crossedout: bool = false,
    fraktur: bool = false,
    overline: bool = false,

    const Self = @This();

    pub fn toU11(self: Self) u11 {
        return @bitCast(self);
    }

    pub fn fromU11(bits: u11) Self {
        return @bitCast(bits);
    }

    /// Returns true iff this font style contains no attributes
    pub fn isDefault(self: Self) bool {
        return self.toU11() == 0;
    }

    /// Returns true iff these font styles contain exactly the same
    /// attributes
    pub fn eql(self: Self, other: Self) bool {
        return self.toU11() == other.toU11();
    }

    /// Returns true iff self is a subset of the attributes of
    /// other, i.e. all attributes of self are at least present in
    /// other as well
    pub fn subsetOf(self: Self, other: Self) bool {
        return self.toU11() & other.toU11() == self.toU11();
    }

    /// Returns this font style with all attributes removed that are
    /// contained in other
    pub fn without(self: Self, other: Self) Self {
        return fromU11(self.toU11() & ~other.toU11());
    }
};

test "FontStyle bits" {
    try testing.expectEqual(@as(u11, 0), (FontStyle{}).toU11());
    try testing.expectEqual(@as(u11, 1), (FontStyle{ .bold = true }).toU11());
    try testing.expectEqual(@as(u11, 1 << 2), (FontStyle{ .italic = true }).toU11());
    try testing.expectEqual(@as(u11, 1 << 2) | 1, (FontStyle{ .bold = true, .italic = true }).toU11());
    try testing.expectEqual(FontStyle{}, FontStyle.fromU11((FontStyle{}).toU11()));
    try testing.expectEqual(FontStyle{ .bold = true }, FontStyle.fromU11((FontStyle{ .bold = true }).toU11()));
}

test "FontStyle subsetOf" {
    const default = FontStyle{};
    const bold = FontStyle{ .bold = true };
    const italic = FontStyle{ .italic = true };
    const bold_and_italic = FontStyle{ .bold = true, .italic = true };

    try testing.expect(default.subsetOf(default));
    try testing.expect(default.subsetOf(bold));
    try testing.expect(bold.subsetOf(bold));
    try testing.expect(!bold.subsetOf(default));
    try testing.expect(!bold.subsetOf(italic));
    try testing.expect(default.subsetOf(bold_and_italic));
    try testing.expect(bold.subsetOf(bold_and_italic));
    try testing.expect(italic.subsetOf(bold_and_italic));
    try testing.expect(bold_and_italic.subsetOf(bold_and_italic));
    try testing.expect(!bold_and_italic.subsetOf(bold));
    try testing.expect(!bold_and_italic.subsetOf(italic));
    try testing.expect(!bold_and_italic.subsetOf(default));
}

test "FontStyle without" {
    const default = FontStyle{};
    const bold = FontStyle{ .bold = true };
    const italic = FontStyle{ .italic = true };
    const bold_and_italic = FontStyle{ .bold = true, .italic = true };

    try testing.expectEqual(default, default.without(default));
    try testing.expectEqual(bold, bold.without(default));
    try testing.expectEqual(default, bold.without(bold));
    try testing.expectEqual(bold, bold.without(italic));
    try testing.expectEqual(bold, bold_and_italic.without(italic));
    try testing.expectEqual(italic, bold_and_italic.without(bold));
    try testing.expectEqual(default, bold_and_italic.without(bold_and_italic));
}

pub const CellStyle = struct {
    foreground: Color = .Default,
    background: Color = .Default,
    font_style: FontStyle = FontStyle{},

    /// Returns true iff this style equals the other style in
    /// foreground color, background color and font style
    pub fn eql(self: CellStyle, other: CellStyle) bool {
        if (!self.font_style.eql(other.font_style))
            return false;

        if (!meta.eql(self.foreground, other.foreground))
            return false;

        return meta.eql(self.background, other.background);
    }

    /// Returns true iff this style equals the default set of styles
    pub fn isDefault(self: CellStyle) bool {
        return eql(self, CellStyle{});
    }

    pub const parse = @import("parse_style.zig").parseStyle;
};

test "style equality" {
    const a = CellStyle{};
    const b = CellStyle{
        .font_style = .{ .bold = true },
    };
    const c = CellStyle{
        .foreground = .Red,
    };

    try testing.expect(a.isDefault());

    try testing.expect(a.eql(a));
    try testing.expect(b.eql(b));
    try testing.expect(c.eql(c));

    try testing.expect(!a.eql(b));
    try testing.expect(!b.eql(a));
    try testing.expect(!a.eql(c));
}
