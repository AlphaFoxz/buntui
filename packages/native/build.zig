const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimizeOpt = b.standardOptimizeOption(.{
        .preferred_optimize_mode = .ReleaseFast,
    });

    const root_module = b.createModule(.{
        .root_source_file = b.path("src/lib.zig"),
        .target = target,
        .optimize = optimizeOpt,
    });
    root_module.linkSystemLibrary("c", .{});

    const lib = b.addLibrary(.{
        .name = "buntui",
        .root_module = root_module,
        .linkage = .dynamic,
    });
    b.installArtifact(lib);

    // WASM build target
    const wasm_target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .wasi,
    });
    const wasm_module = b.createModule(.{
        .root_source_file = b.path("src/wasm_lib.zig"),
        .target = wasm_target,
        .optimize = optimizeOpt,
    });
    wasm_module.linkSystemLibrary("c", .{});

    const wasm_lib = b.addExecutable(.{
        .name = "buntui",
        .root_module = wasm_module,
    });

    const wasm_install = b.addInstallArtifact(wasm_lib, .{
        .dest_dir = .{ .override = .{ .custom = "wasm32-wasi" } },
        .dest_sub_path = "buntui.wasm",
    });

    const wasm_step = b.step("wasm", "Build WASM library");
    wasm_step.dependOn(&wasm_install.step);

    // Unit tests — runs all `test` blocks found via tests.zig imports
    const test_module = b.createModule(.{
        .root_source_file = b.path("src/tests.zig"),
        .target = target,
        .optimize = optimizeOpt,
    });
    test_module.linkSystemLibrary("c", .{});
    const run_unit_tests = b.addTest(.{
        .root_module = test_module,
    });

    const test_step = b.step("test", "Run all unit tests");
    test_step.dependOn(&run_unit_tests.step);
}
