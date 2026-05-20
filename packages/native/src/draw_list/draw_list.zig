const tui_context = @import("../core/tui_context.zig");
const parser = @import("./parser.zig");
const presenter = @import("./presenter.zig");

pub const RasterizerState = parser.RasterizerState;

pub fn renderDrawList(ctx: *tui_context.TuiContext, buf_ptr: [*]const u8, buf_len: usize) void {
    const result = parser.parseDrawList(ctx, buf_ptr, buf_len) orelse return;
    presenter.presentFrame(ctx, result);
}
