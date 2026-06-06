# {{name}}

A browser-based terminal UI application built with [buntui](https://github.com/AlphaFoxz/buntui) targeting WASM.

## Development

```bash
bun run dev
```

Opens a browser with a terminal emulator. Edit `.vue` files and see changes live via Vite HMR.

## Build

```bash
bun run build
```

The built output is in `dist/`.

## Project Structure

```
index.html        Browser shell (Vite dev entry)
src/
  dev-shell.ts    Browser bootstrap (xterm.js + WASM)
  apps/main/
    App.vue       Root SFC component
```
