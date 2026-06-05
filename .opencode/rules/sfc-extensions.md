# SFC Extension Widget Imports

## Core vs Extension Widget Resolution

The compiler resolves template tags with a three-tier strategy (highest priority first):

1. **User .vue components** — tags matching an imported `.vue` file (`<script setup>` imports with `.vue` source) are treated as child components, not widgets.

2. **Extension/custom widgets** — resolved via explicit imports in `<script setup>`. The compiler detects any PascalCase default or named import that is NOT in the registry and treats it as a widget creator. Without the import, the tag throws `Unknown component` at compile time.

3. **Core widgets** — resolved via `CORE_REGISTRY` (`compiler/src/runtime-helpers.ts`). Tags `<Box>`, `<Text>`, `<Input>`, `<Button>`, `<Checkbox>`, `<RadioGroup>`, `<SelectButton>`, `<Select>`, `<Switch>`, `<ScrollBox>`, `<Textarea>`, `<Table>`, `<Progress>` map to creator functions from `@buntui/core`. The codegen auto-generates the import.

## Extension Package Structure

`@buntui/extensions` uses sub-path exports for tree-shaking:

```json
{
  ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
  "./matrix": { "types": "./dist/matrix.d.ts", "default": "./dist/matrix.js" },
  "./framerate": { "types": "./dist/framerate.d.ts", "default": "./dist/framerate.js" },
  "./snake": { "types": "./dist/snake.d.ts", "default": "./dist/snake.js" },
  "./videoplayer": { "types": "./dist/videoplayer.d.ts", "default": "./dist/videoplayer.js" },
  "./logger": { "types": "./dist/logger.d.ts", "default": "./dist/logger.js" },
  "./hmr-error-overlay": { "types": "./dist/hmr-error-overlay.d.ts", "default": "./dist/hmr-error-overlay.js" }
}
```

Each sub-path module has a **default export** (the creator function) and named exports (class, types), **except** `hmr-error-overlay` which exports `mountHmrErrorOverlay` (a mount function, not a creator) and `HmrErrorOverlayHandle` (a handle type). It is not included in `EXTENSION_REGISTRY`.

```ts
// src/matrix.ts
export {MatrixWidget, createMatrixWidget} from './widgets/matrix/MatrixWidget';
export type {MatrixWidgetOptions} from './widgets/matrix/types';
export {createMatrixWidget as default} from './widgets/matrix/MatrixWidget';
```

## Usage in SFC

```vue
<script setup>
import Matrix from '@buntui/extensions/matrix'
</script>
<template>
  <Matrix width="100%" height="100%" />
</template>
```

- Default import is preferred over named import (`import Matrix from ...` not `import {Matrix} from ...`)
- The import identifier is used directly as the creator in generated code: `Matrix({width: "100%", height: "100%"})`
- No codegen import is generated — the script import provides the binding

## Build and Dev Setup

- `vue-plugin.ts` (in `packages/compiler/src/` and `packages/cli/src/lib/`), `dev.ts`, and `build.ts` (in `packages/cli/src/commands/`) use `CORE_REGISTRY` only — never merge `EXTENSION_REGISTRY`
- The barrel `index.ts` re-exports `EXTENSION_REGISTRY` for consumers who want global registration, but CLI and recommended usage rely on explicit imports

## Adding a New Extension Widget

1. Create widget in `packages/extensions/src/widgets/<name>/`
2. Create sub-path entry `packages/extensions/src/<name>.ts` with default export = creator function
3. Add `"./<name>"` to `package.json` exports map
4. Re-export from barrel `src/index.ts`
5. Add tag-to-creator entry in `src/registry.ts`
6. Build: `bun run --cwd ./packages/extensions build`
