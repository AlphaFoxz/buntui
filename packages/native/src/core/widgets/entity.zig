const component = @import("./component.zig");

pub const TuiWidgetEntity = extern struct {
    entity_id: u64,
    mask: component.ComponentMasks,
    rect: *component.RectComponent,
    color: *component.ColorComponent,
    style: *component.StyleComponent,
    border: *component.BorderComponent,
    shadow: *component.ShadowComponent,
    text: [*:0]const u8,
};
