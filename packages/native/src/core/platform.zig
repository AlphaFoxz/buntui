const builtin = @import("builtin");

pub const is_wasm = builtin.cpu.arch == .wasm32;

pub const is_posix = builtin.os.tag == .linux or builtin.os.tag == .macos or builtin.os.tag == .freebsd or builtin.os.tag == .netbsd or builtin.os.tag == .openbsd;

pub const is_windows = builtin.os.tag == .windows;
