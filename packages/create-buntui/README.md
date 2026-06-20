# create-buntui

Interactive scaffolding CLI for [buntui](https://github.com/AlphaFoxz/buntui) terminal UI apps. Pick a template, init git, and install dependencies from an in-terminal UI.

## Usage

```bash
bunx create-buntui@alpha [project-name]
```

Also works:

```bash
npm create buntui@alpha
npx create-buntui@alpha
```

> Note: prefer `bunx create-buntui` over `bun create buntui`. Bun's `create` command resolves its own GitHub template registry first and may not map `buntui` to this package; `bunx` always runs the published `create-buntui` binary.

If a project name is omitted, you can type it in the interactive prompt.

## What it does

1. Prompts for a project name and template.
2. Optionally initializes a git repository.
3. Copies the template, then runs `bun install`.

## Templates

| Template | Description |
| --- | --- |
| `basic` | Minimal starter: Box, Text, Button, and a clock demo. |
| `sfc` | SFC compiler + HMR hot-reload dev server setup. |
| `full` | All core widgets showcase with tabbed navigation and theme support. |
| `wasm` | WASM / browser target with xterm.js. |

## Requirements

- [Bun](https://bun.sh) runtime.
- A terminal with ANSI support (Windows Terminal, iTerm2, GNOME Terminal, etc.).

## The native binary didn't load

buntui renders through a platform-specific native library (`buntui.dll` / `buntui.so` / `buntui.dylib`), installed automatically via `@buntui/native`'s optional dependencies. If `bunx`/`npx` skipped them, you'll see an error like `Could not locate the native rendering library`. Fix it with either:

```bash
# install the binary for your platform explicitly
bun add @buntui/native-<platform-arch>   # e.g. win32-x64, linux-x64, darwin-arm64

# or point to a binary you already have
# set BUNTUI_DLL=/absolute/path/to/buntui.dll   (Windows)
# set BUNTUI_DLL=/absolute/path/to/libbuntui.so (Linux)
```

## License

[Apache-2.0](https://github.com/AlphaFoxz/buntui/blob/main/LICENSE)
