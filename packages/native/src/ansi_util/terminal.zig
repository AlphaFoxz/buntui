const esc = "\x1B";
const csi = esc ++ "[";

pub fn disableLineWrap(writer: anytype) !void {
    try writer.writeAll(csi ++ "?7l");
}

pub fn disableLineWrapAndFlush(writer: anytype) !void {
    try disableLineWrap(writer);
    try writer.flush();
}

pub fn enableLineWrap(writer: anytype) !void {
    try writer.writeAll(csi ++ "?7h");
}

pub fn enableLineWrapAndFlush(writer: anytype) !void {
    try enableLineWrap(writer);
    try writer.flush();
}

pub fn saveScreen(writer: anytype) !void {
    try writer.writeAll(csi ++ "?47h");
}

pub fn saveScreenAndFlush(writer: anytype) !void {
    try saveScreen(writer);
    try writer.flush();
}

pub fn restoreScreen(writer: anytype) !void {
    try writer.writeAll(csi ++ "?47l");
}

pub fn restoreScreenAndFlush(writer: anytype) !void {
    try restoreScreen(writer);
    try writer.flush();
}

pub fn enterAlternateScreen(writer: anytype) !void {
    try writer.writeAll(csi ++ "?1049h");
}

pub fn enterAlternateScreenAndFlush(writer: anytype) !void {
    try enterAlternateScreen(writer);
    try writer.flush();
}

pub fn leaveAlternateScreen(writer: anytype) !void {
    try writer.writeAll(csi ++ "?1049l");
}

pub fn leaveAlternateScreenAndFlush(writer: anytype) !void {
    try leaveAlternateScreen(writer);
    try writer.flush();
}

pub fn setSize(writer: anytype, columns: u16, rows: u16) !void {
    try writer.print(csi ++ "8;{d};{d}t", .{ rows, columns });
}

pub fn setSizeAndFlush(writer: anytype, columns: u16, rows: u16) !void {
    try setSize(writer, columns, rows);
    try writer.flush();
}

pub fn setTitle(writer: anytype, title: []const u8) !void {
    try writer.print(esc ++ "]0;{s}\x07", .{title});
}

pub fn setTitleAndFlush(writer: anytype, title: []const u8) !void {
    try setTitle(writer, title);
    try writer.flush();
}

pub fn beginSynchronizedUpdate(writer: anytype) !void {
    try writer.writeAll(csi ++ "?2026h");
}

pub fn beginSynchronizedUpdateAndFlush(writer: anytype) !void {
    try beginSynchronizedUpdate(writer);
    try writer.flush();
}

pub fn endSynchronizedUpdate(writer: anytype) !void {
    try writer.writeAll(csi ++ "?2026l");
}

pub fn endSynchronizedUpdateAndFlush(writer: anytype) !void {
    try endSynchronizedUpdate(writer);
    try writer.flush();
}
