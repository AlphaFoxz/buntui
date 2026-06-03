# {{name}}

A terminal UI application built with [buntui](https://github.com/AlphaFoxz/buntui) using SFC (Single File Component) templates.

## Development

```bash
bun run dev
```

Hot module replacement (HMR) is enabled. Edit `.vue` files and see changes live.

## Build

```bash
bun run build
```

The built output is in `dist/`.

## Project Structure

```
src/
  apps/main/     App entry point
    App.vue      Root SFC component
    main.ts      Production & dev entry
  shared/
    runApp.ts    App bootstrap helper
```
