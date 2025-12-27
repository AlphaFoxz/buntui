const std = @import("std");

var id_generator = std.atomic.Value(u64).init(1);

pub fn genId() u64 {
    return id_generator.fetchAdd(1, .monotonic);
}
