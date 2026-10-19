---
paths:
  - "packages/native/**"
---

# POSIX termios: Never Use `std.posix.tcgetattr` / `std.posix.tcsetattr` on Linux

`std.posix.termios` does not match the libc ABI on Linux. Passing it to libc
`tcgetattr`/`tcsetattr` — directly or via `std.posix.tcgetattr`/`std.posix.tcsetattr` —
causes a **16-byte out-of-bounds stack write** with glibc. This is a Zig
standard library bug (`std.c.termios` aliases the kernel layout, not the libc
layout), verified on Zig 0.17.0 + glibc 2.43 (Ubuntu). Always use
`ioctl(fd, TCGETS/TCSETS)` instead — see
`packages/native/src/input/posix_mode.zig` for the required pattern.

## Symptom

- Native app crashes on Linux **only** in `-Drelease=true` builds, around
  terminal raw-mode switching (startup or cleanup).
- `zig test ... -lc` (Debug) never crashes; debugging in Debug mode
  reproduces nothing.

## Root Cause: Three Different `struct termios` Sizes

All offsets are x86_64.

**Kernel `struct termios`** — what `ioctl(TCGETS/TCSETS)` actually reads/writes:

| Field               | Offset | Size |
|---------------------|--------|------|
| iflag/oflag/cflag/lflag | 0  | 16   |
| line                | 16     | 1    |
| cc[19] (`NCCS=19`)  | 17     | 19   |
| **total**           |        | **36** |

**Zig 0.17.0 `std.c.termios` on Linux** = `std.os.linux.termios` (kernel layout + ispeed/ospeed):

| Field                        | Offset | Size |
|------------------------------|--------|------|
| iflag/oflag/cflag/lflag      | 0      | 16   |
| line                         | 16     | 1    |
| cc[19] (`NCCS=19`)           | 17     | 19   |
| ispeed/ospeed (kernel never touches) | 36 | 8 |
| **total**                    |        | **44** |

**glibc `struct termios`** — what libc `tcgetattr`/`tcsetattr` require:

| Field               | Offset | Size |
|---------------------|--------|------|
| iflag/oflag/cflag/lflag | 0  | 16   |
| line                | 16     | 1    |
| cc[32] (`NCCS=32`)  | 17     | 32   |
| padding             | 49     | 3    |
| ispeed/ospeed       | 52     | 8    |
| **total**           |        | **60** |

Zig std source (`lib/std/c.zig`, 0.17.0):

```zig
pub const NCCS = switch (native_os) {
    .linux => linux.NCCS,    // 19 — the KERNEL value, not the libc value (32)
    ...
};
pub const termios = switch (native_os) {
    .linux => linux.termios, // 44-byte kernel layout
    ...
};
pub extern "c" fn tcgetattr(fd: fd_t, termios_p: *termios) c_int; // binds glibc with the wrong size
```

The resolution chain when linking libc (this project always links `-lc` on POSIX):

```
std.posix.termios = system.termios = std.c.termios  (44 bytes, kernel layout)
std.posix.tcgetattr -> system.tcgetattr = std.c.tcgetattr  (glibc symbol, expects 60 bytes)
```

Every call hands glibc a pointer to a 44-byte struct where glibc writes 60.

## Proof: glibc 2.43 `tcgetattr` Disassembly

glibc's `tcgetattr` is **not** a plain ioctl forward. It calls `ioctl(TCGETS)`
into its own stack buffer, then converts and fully initializes the caller's
60 bytes (`%rbx` = caller's `termios_p`):

```asm
objdump -d /lib/x86_64-linux-gnu/libc.so.6 --disassemble=tcgetattr

mov    $0x802c542a,%esi     ; TCGETS
syscall                     ; ioctl(fd, TCGETS, glibc's own 80-byte local buffer)
lea    -0x50(%rbp),%rdi
call   1294e0 <...>         ; kernel layout -> glibc layout conversion
movq   $0x0,0x24(%rbx)      ; zero caller bytes 36..44
movups %xmm0,0x2c(%rbx)     ; write caller bytes 44..60  <-- 16 bytes PAST the Zig struct
mov    %rdx,0x34(%rbx)      ; write caller bytes 52..60 (ispeed/ospeed)
```

## Deterministic PoC

Run on a real TTY (or wrap with `script -qec`), build with `-lc`:

```zig
const std = @import("std");

pub fn main() void {
    const zig_size = @sizeOf(std.posix.termios);
    var buf: [zig_size + 16]u8 align(16) = @splat(0xAA);
    const t: *std.posix.termios = @ptrCast(&buf);

    _ = std.c.tcgetattr(0, t);

    var oob: usize = 0;
    for (buf[zig_size..]) |b| {
        if (b != 0xAA) oob += 1;
    }
    std.debug.print("struct size = {d}, bytes beyond it modified: {d}/16\n", .{ zig_size, oob });
}
```

```sh
zig build-exe poc.zig -lc -OReleaseFast -femit-bin=poc
script -qec ./poc /dev/null
# Output: struct size = 44, bytes beyond it modified: 16/16
```

The buffer is sized to the full 60 bytes glibc needs, so the write itself is
ABI-legal — only bytes 44..60, which Zig's type claims do not exist, get
modified. This isolates the size mismatch from any UB in the test.

## Why Release-Only

The OOB write happens on **every** call in every build mode. Whether it
crashes depends on the caller's stack frame layout:

- **Debug**: large frames with padding — the 16-byte smash lands in unused
  space, nothing observable.
- **Release**: packed locals — the smash hits adjacent locals / saved
  registers, causing corruption and crashes at seemingly unrelated points.

Never conclude "no crash in Debug means no bug" for this issue.

## Why It Surfaced Recently

Older glibc forwarded `tcgetattr` straight to `ioctl(TCGETS, caller_buf)`; the
kernel writes only 36 bytes, which fits inside Zig's 44 — the mismatch was
latent and harmless for years. glibc 2.42+ switched to the
convert-and-fully-initialize approach, turning the latent ABI mismatch into a
real overflow. (Verified against Ubuntu glibc 2.43.)

## Affected Scope

| Platform / mode                        | Status |
|----------------------------------------|--------|
| Linux + linked libc (glibc verified; musl also uses `NCCS=32`) | **Broken — banned** |
| Linux without libc (raw syscalls; `std.posix` falls back to `std.os.linux`) | Safe |
| macOS / Darwin (`std.c.termios` is Zig's own ABI-correct definition, `NCCS=20`, `ispeed align(8)`) | Safe |
| Windows | Irrelevant (uses Console API) |

This project always links libc on POSIX, so treat `std.posix.tcgetattr`,
`std.posix.tcsetattr`, and any `*std.posix.termios` passed to libc functions
as **banned on Linux**. If a future Zig version changes `std.c.termios`,
re-run the PoC before reverting to the stdlib API.

## Required Pattern

Use `ioctl` with the kernel request codes (excerpt from
`packages/native/src/input/posix_mode.zig`):

```zig
const TCGETS: c_ulong = 0x5401;
const TCSETS: c_ulong = 0x5402;

extern "c" fn ioctl(fd: c_int, request: c_ulong, arg: *anyopaque) c_int;

fn libcTcgetattr(fd: std.posix.fd_t, term: *std.posix.termios) bool {
    while (true) {
        if (ioctl(fd, TCGETS, @ptrCast(term)) == 0) {
            return true;
        }
        if (std.c._errno().* != EINTR_ERRNO) {
            return false;
        }
    }
}
```

Why this is safe:

- **`TCGETS`**: the kernel writes only the 36-byte kernel struct into the
  44-byte Zig struct — no overflow.
- **`TCSETS`**: the kernel reads only the first 36 bytes; the `undefined`
  `ispeed`/`ospeed` tail is never consumed, so passing a struct with
  uninitialized tails is fine.
- **Field access** (`termios.lflag.ICANON`, `termios.cc[...]`, etc.) matches
  the kernel layout, which is exactly what the kernel expects.
- `termios.cflag.CSIZE = .CS8` and `termios.cc[@backingInt(std.posix.V.MIN)]`
  are valid — the Zig bitfield packed-structs (`tc_cflag_t`) and `V` indices
  match the kernel encoding.

## See Also

- `packages/native/src/input/posix_mode.zig` — the working implementation
- `.opencode/rules/zig-coding.md` — general Zig 0.17 API notes
- `lib/std/c.zig` / `lib/std/os/linux.zig` in the Zig 0.17.0 source tree
