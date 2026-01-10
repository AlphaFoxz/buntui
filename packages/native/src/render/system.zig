const std = @import("std");
const frame = @import("./frame.zig");
const TuiScene = @import("../core/tui_app.zig").TuiScene;
const Rgba = @import("../ansi_util/style.zig").Rgba;

var bitmap: std.DynamicBitSet = undefined;

pub fn rasterizationSystem(scene: *TuiScene) void {
    for (scene.widgets.items) |widget| {
        // switch (widget) {
        // t1: case 1 => {},
        // else => unreachable,
        // }
        if (widget.isText()) {}
    }

    for (frame.next_frame.cells) |*cell| {
        if (cell.entity_id == 0) {
            cell.bg_rgba = Rgba.fromU32(scene.bg_rgba.toU32());
        }
    }
}

inline fn skipRenderCell() bool {}
