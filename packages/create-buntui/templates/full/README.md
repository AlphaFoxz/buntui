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
  apps/main/             App entry point
    App.vue              Root SFC with tabbed widget demos
    main.ts              Production & dev entry
    components/
      BoxDemo.vue        Box layout demos
      ButtonDemo.vue     Button interaction demos
      InputDemo.vue      Text input demos
      CheckboxDemo.vue   Checkbox toggle demos
      SwitchDemo.vue     Switch toggle demos
      ProgressDemo.vue   Progress bar demos
      RadioDemo.vue      Radio group selection demos
      TextDemo.vue       Text display demos
  shared/
    runApp.ts            App bootstrap helper
```
