const frame = @import("./frame.zig");
const TuiScene = @import("../core/tui_app.zig").TuiScene;

pub fn widgetBorderSystem(scene: *TuiScene) void {
    for (scene.widgets.items) |widget| {
        if (widget.mask) {}
    }
}
