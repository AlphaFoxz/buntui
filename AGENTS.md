# AGENTS.md

## Runtime & Package Manager

**Bun only.** Never use `npm`, `npx`, `yarn`, or `pnpm`. Use `bunx` instead of `npx`.

## Commands

| Task | Command |
|---|---|
| Full build (sync versions + topological build) | `bun run build` |
| Dev server (playground + HMR) | `bun run dev <app-name>` (e.g., `bun run dev demo`) |
| Dev server (WASM playground) | `bun run wasm [app-name]` (e.g., `bun run wasm main`, default: `main`) |
| Run all TS tests | `bun run test:ts` |
| Run all Zig tests | `bun run test:zig` |
| Run a single TS test | `bun test packages/core/src/widgets/box/__tests__/BoxWidget.test.ts` |
| Lint (xo, **auto-fix**) | `bun run check` |
| Sync root version to all packages | `bun run sync` |
| Build native only | `bun run --cwd ./packages/native build` |
| Build core only | `bun run --cwd ./packages/core build` |
| Build compiler only | `bun run --cwd ./packages/compiler build` |

There is no dedicated typecheck script. TypeScript checking is done per-package via `tsc --project ./tsconfig.json` during each package's build step.

## Build Order

`bun run build` runs `sync` then `scripts/build.ts`, which does a topological sort of all packages under `packages/` and builds them in dependency order. The typical order is:

**native → core → extensions → compiler → cli → playground → buntui → create-buntui → playground-wasm → github-pages**

Native must build first because `core` copies the shared library (`.dll`/`.dylib`/`.so`) from `packages/native-platforms/<platform>/` into `packages/core/src/utils/`. If you skip native, core's `sync` script warns but continues, and runtime FFI will fail.

## Monorepo Layout

```
packages/native/          Zig rendering engine → shared library (buntui.dll/.dylib/.so/.wasm)
packages/native-platforms/ Pre-built binaries: win32-x64, linux-x64, darwin-x64, darwin-arm64, wasm32-wasi
packages/core/            TS runtime: widget system, FFI bindings, event bus, draw list
packages/extensions/      Extra widgets with sub-path exports (matrix, snake, etc.)
packages/compiler/        SFC compiler (.vue → TS) using Vue compiler-core
packages/cli/             CLI tool (buntui bin): dev server + build commands
packages/playground/      Multi-app playground: `bun run dev <app-name>` (apps: demo, video-player)
packages/buntui/          Umbrella package re-exporting core + extensions
packages/create-buntui/   CLI scaffolding tool (bunx create-buntui)
packages/playground-wasm/ WASM playground: SFC-based TUI apps compiled for browser (Vite dev + Bun.build, multi-app under src/apps/)
packages/github-pages/    Private package: WASM web demo shell (Vite + xterm.js), imports compiled apps from playground-wasm/dist/
```

## Testing

- Tests live in `__tests__/` directories next to the source they test, named `*.test.ts`.
- Bun's built-in test runner: `it()` + `expect()`.
- Most tests are in `packages/core/`. Compiler and extensions have few or no tests.
- Zig tests: `bun run --cwd ./packages/native zig-test` (runs `zig test src/tests.zig -lc`).

## Linting (xo)

`bun run check` runs `xo --fix` — it **auto-fixes** files in place.
`xo.config.ts` enforces rules an agent might not guess:
- **`DataView` is banned** — use `TuiDataViewWrapper` from `extern/TuiDataViewWrapper.ts`.
- **`Buffer` is banned** — use `Uint8Array`.
- **`object` type is banned** — use `Record<string, unknown>`.
- **Empty array type `[]` is banned** — always specify element type.
- **No `no-bitwise`** — bitwise operators are allowed.
- 2-space indentation.
- ECMAScript `#` private fields, not TypeScript `private` keyword.
- Variable names: `camelCase`, `PascalCase`, or `UPPER_CASE`. Filenames: `kebab-case`, `camelCase`, or `PascalCase`.
- Test files (`*.test.ts`) and `.vue` files are excluded from lint.

## Architecture Quick Reference

### FFI Boundary
- Zig exports C ABI functions from `packages/native/src/lib.zig` (thin wrappers only — logic lives in separate modules).
- TS consumes them via `bun:ffi` `dlopen()` in `packages/core/src/app/NativeBackend.ts`.
- Branded types (`U8`, `U16`, `U32`, `I32`, `BOOL`, etc.) are defined in root `global.d.ts`. `Pointer` is defined in `packages/core/src/platform/pointer.ts`.
- Core has dual platform support: `platform/native.ts` (Bun FFI) and `platform/browser.ts` (WASM/web). The `browser` field in `core/package.json` swaps the implementation.

### Rendering Pipeline
TS widgets → `emitDrawCommands()` → `DrawListBuffer` (binary) → FFI `renderDrawList()` → Zig rasterizer → ANSI output.

### Event System
Lock-free SPSC ring buffer. Zig emits binary events, TS polls/commits. Three-step protocol: `poll()` → read → `commit()` (must always pair).

### SFC Compiler
`compiler/src/compile.ts`: parse → transform → codegen. Three-tier resolution: (1) `.vue` component imports, (2) explicit widget imports, (3) `CORE_REGISTRY` auto-resolve for core widgets (`<Box>`, `<Text>`, `<Input>`, `<Button>`, `<Checkbox>`, `<RadioGroup>`, `<SelectButton>`, `<Select>`, `<Switch>`, `<ScrollBox>`, `<Textarea>`, `<Table>`, `<Progress>`). Extension widgets require explicit `import X from '@buntui/extensions/x'` in `<script setup>`.

## Key Conventions

- **`undefined` vs `null`**: `undefined` = technical absence (not yet loaded), `null` = domain-level absence.
- **Type imports**: `import {type Foo} from 'bar'` or `import type {Foo} from 'bar'`.
- **Zig naming**: functions `camelCase`, locals `snake_case`, globals `SCREAMING_SNAKE_CASE`, types `PascalCase`. Paired lifecycles: `create/destroy`, `init/deinit`, `start/stop`.
- **Zig 0.16 Windows**: `std.os.windows.BOOL` is an enum — compare with `.FALSE`/`.TRUE`, not integers. Custom `typedef.Bool` (in `core/typedef.zig`) uses `.False`/`.True` (PascalCase). Declare Win32 functions as `extern "kernel32"` directly.
- **Zig error handling**: Never propagate error unions across FFI. Use status codes in exports, `core/error.zig` helpers for fatal errors.
- **No comments in code** unless explicitly requested.
- **Widget method naming** (`set*` vs `update*`):
  - `set*` — direct scalar assignment with minimal side-effects. Accepts a single value (boolean, string, number, array). Examples: `setDisabled`, `setVisible`, `setChecked`, `setLabel`, `setGap`, `setAlign`, `setDirection`, `setMax`, `setOptions`, `setColorScrollbar`, `setColorScrollbarTrack`.
  - `update*` — structured `Partial<T>` merge and/or complex value transformation with cascading side-effects. Compiler batches multiple fields targeting the same method into one call. Examples: `updateRect`, `updateColor`, `updateBorder`, `updateShadow`, `updatePadding`, `updateStyle`, `updateValue`.

## CI

`.github/workflows/publish.yml` cross-compiles the Zig native library for 5 targets (win32-x64, linux-x64, darwin-x64, darwin-arm64, wasm32-wasi) using Zig 0.16.0 with `-Drelease=true`, then publishes all packages to npm. Triggered on `v*` tag pushes and manual dispatch. Pre-release tags (alpha/beta/rc) are automatically mapped to matching npm dist-tags.
