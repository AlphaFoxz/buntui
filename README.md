**English** | [中文](./README.zh-CN.md)

<h1 align="center">buntui</h1>

<p align="center">
  <strong>A high-performance Terminal UI framework — Zig rendering + Vue SFC authoring + Bun runtime</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Zig-0.16-f7a41d?logo=zig" alt="Zig 0.16" />
  <img src="https://img.shields.io/badge/Bun-runtime-000?logo=bun" alt="Bun" />
  <img src="https://img.shields.io/badge/Vue-SFC-42b883?logo=vue.js" alt="Vue SFC" />
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License" />
</p>

---

## Quick Start

```bash
bunx create-buntui@alpha
cd my-app-name
bun dev
```

## Why buntui?

|                           |                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| **Vue SFC in terminal**   | Write `.vue` files with `<template>`, `<script setup>`, reactive bindings — just like a web app |
| **Zig-powered rendering** | Native rasterizer via FFI — zero GC pauses, minimal frame time                                  |
| **Bun runtime**           | Full OS access in `<script>` — spawn processes, read files, call any npm package                |
| **Hot reload**            | Edit `.vue` files and see changes instantly, no restart needed                                  |
| **Rich widget set**       | Box, Text, Input, Button, Checkbox, Switch, RadioGroup, SelectButton, Progress, ScrollBox       |

## Architecture

```text
                        ┌──────────── TypeScript ──────────────┐
                        │                                      │
                        │  .vue SFC ──→ Widget Tree            │
                        │   (compiler)   (Vue reactivity)      │
                        │                    │                 │
                        │                    ▼                 │
                        │            emitDrawCommands()        │
                        │                    │                 │
                        │                    ▼                 │
                        │            DrawListBuffer (binary)   │
                        └────────┬───────────┬─────────────────┘
                                 │           │
                    ┌────────────┘           └──────────────┐
                    ▼                                       ▼
         NativeBackend (Bun)                      HtmlBackend (Browser)
         dlopen() + FFI ptr                       WasmModule + xterm.js
                    │                                       │
                    ▼                                       ▼
         ┌──── Zig .dll / .dylib / .so ────┐    ┌─── Zig .wasm ─────────┐
         │                                 │    │                       │
         │  Parse ──→ Rasterize ──→ Diff   │    │  Parse ──→ Rasterize  │
         │            (per-cmd)     │      │    │            (per-cmd)  │
         │                          ▼      │    │                │      │
         │                     ANSI output │    │                ▼      │
         └──────────────────┬──────────────┘    │      in-memory buf    │
                            │                   └────────────┬──────────┘
                            ▼                                ▼
                      Real Terminal                 xterm.js Terminal
```

Per-frame: reset buffer → widget tree emits draw commands → Zig rasterizes (native FFI or WASM) → diff dirty cells → ANSI output.

## Example

```vue
<template>
  <Box :x="1" :y="1" :width="40" :height="5" borderStyle="rounded" :borderColor="'rgba(137,180,250,1)'">
    <Text :colorFg="'rgba(205,214,244,1)'" :value="greeting" />
    <Button :width="16" :height="3" value="Click me" @click="onClick" />
  </Box>
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity'

const name = ref('world')
const greeting = computed(() => `Hello, ${name.value}!`)

function onClick() {
  name.value = 'buntui'
}
</script>
```

## Built-in Widgets

| Widget           | Description                                                                            |
| ---------------- | -------------------------------------------------------------------------------------- |
| `<Box>`          | Container with border, padding, flex layout (direction, gap, align), shadow, draggable |
| `<Text>`         | Styled text with font modifiers (bold, italic, underline …), marquee overflow          |
| `<Input>`        | Text field with cursor, selection, undo/redo, clipboard, password mode, floating label |
| `<Button>`       | 5-state button (normal / hovered / focused / pressed / disabled), customizable colors  |
| `<Checkbox>`     | Tri-state checkbox (unchecked / checked / indeterminate)                               |
| `<Switch>`       | Toggle switch with on/off indicators                                                   |
| `<RadioGroup>`   | Vertical radio button group with keyboard navigation                                   |
| `<SelectButton>` | Horizontal segmented control (tab bar)                                                 |
| `<Progress>`     | Determinate and indeterminate progress bar with animation                              |
| `<ScrollBox>`    | Scrollable container with scrollbar, mouse drag, keyboard paging                       |

## Extension Widgets

```bash
import Matrix      from '@buntui/extensions/matrix'
import Snake       from '@buntui/extensions/snake'
import VideoPlayer from '@buntui/extensions/videoplayer'
import Logger      from '@buntui/extensions/logger'
import FrameRate   from '@buntui/extensions/framerate'
```

| Widget      | Description                                   |
| ----------- | --------------------------------------------- |
| Matrix      | The Matrix rain animation background          |
| Snake       | Playable Snake game (arrow keys + Space)      |
| VideoPlayer | Video playback as braille art in the terminal |
| Logger      | Floating draggable log panel with timestamps  |
| FrameRate   | Real-time FPS counter overlay                 |

## Monorepo

```text
packages/
├── native/              Zig rendering engine → shared library (.dll / .dylib / .so / .wasm)
├── native-platforms/    Pre-built binaries (win32-x64, linux-x64, darwin-x64, darwin-arm64, wasm32-wasi)
├── core/                TS runtime: widgets, FFI + WASM backends, event bus, draw list
├── extensions/          Extra widgets with sub-path exports
├── compiler/            SFC compiler (.vue → TS) based on Vue compiler-core
├── cli/                 CLI tool: dev server + build commands
├── playground/          Terminal demo app (Bun runtime)
├── playground-wasm/     WASM demo app (browser + xterm.js)
├── buntui/              Umbrella package (core + extensions)
├── create-buntui/       CLI scaffolding tool
└── github-pages/        WASM web demo shell for deployment
```

## License

[Apache-2.0](./LICENSE)
