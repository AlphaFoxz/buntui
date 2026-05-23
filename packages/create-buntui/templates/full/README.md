# {{name}}

A full-featured terminal UI application built with [buntui](https://github.com/AlphaFoxz/buntui).

Demonstrates all core widgets with tabbed navigation.

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
  main.ts              Production entry
  dev.ts               Dev server with HMR
  App.vue              Root SFC with tabbed widget demos
  env.d.ts             Type declarations for TUI events
  components/
    BoxDemo.vue        Box layout demos
    ButtonDemo.vue     Button interaction demos
    InputDemo.vue      Text input demos
    CheckboxDemo.vue   Checkbox toggle demos
    SwitchDemo.vue     Switch toggle demos
    ProgressDemo.vue   Progress bar demos
    RadioDemo.vue      Radio group selection demos
    ScrollBoxDemo.vue  Scrollable content demos
    TextDemo.vue       Text display demos
```
