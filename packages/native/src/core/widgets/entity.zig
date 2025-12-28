const component = @import("./component.zig");

pub const WidgetEntityMasks = enum(u32) {
    Rect = 0x0001,
    Color = 0x0002,
    Style = 0x0004,
    Border = 0x0008,
    Shadow = 0x0010,
    Text = 0x0020,
};

pub const TuiWidgetEntity = extern struct {
    entity_id: u64,
    mask: WidgetEntityMasks,
    rect: *component.RectComponent,
    color: *component.ColorComponent,
    style: *component.StyleComponent,
    border: *component.BorderComponent,
    shadow: *component.ShadowComponent,
    text: [*:0]const u8,

    pub fn isRect(self: *const TuiWidgetEntity) bool {
        return (self.mask & WidgetEntityMasks.Rect) == WidgetEntityMasks.Rect;
    }

    pub fn isColor(self: *const TuiWidgetEntity) bool {
        return (self.mask & WidgetEntityMasks.Color) == WidgetEntityMasks.Color;
    }

    pub fn isStyle(self: *const TuiWidgetEntity) bool {
        return (self.mask & WidgetEntityMasks.Style) == WidgetEntityMasks.Style;
    }

    pub fn isBorder(self: *const TuiWidgetEntity) bool {
        return (self.mask & WidgetEntityMasks.Border) == WidgetEntityMasks.Border;
    }

    pub fn isShadow(self: *const TuiWidgetEntity) bool {
        return (self.mask & WidgetEntityMasks.Shadow) == WidgetEntityMasks.Shadow;
    }

    pub fn isText(self: *const TuiWidgetEntity) bool {
        return (self.mask & WidgetEntityMasks.Text) == WidgetEntityMasks.Text;
    }
};
