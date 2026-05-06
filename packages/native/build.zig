const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimizeOpt = b.standardOptimizeOption(.{
        .preferred_optimize_mode = .Debug,
        // .preferred_optimize_mode = .ReleaseSmall,
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

fn createModule(
    b: *std.Build,
    code_path: []const u8,
    target: std.Build.ResolvedTarget,
    optimize_opt: std.builtin.OptimizeMode,
) *std.Build.Module {
    return b.createModule(.{
        .root_source_file = b.path(code_path),
        .target = target,
        .optimize = optimize_opt,
    });
}

fn createDependency(
    b: *std.Build,
    name: []const u8,
    target: std.Build.ResolvedTarget,
    optimize_opt: std.builtin.OptimizeMode,
) *std.Build.Module {
    const dep = b.dependency(name, .{
        .target = target,
        .optimize = optimize_opt,
    });
    return dep.module(name);
}
