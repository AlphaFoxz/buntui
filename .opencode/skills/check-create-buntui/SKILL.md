---
name: check-create-buntui
description: Validate create-buntui scaffolding templates, imports, widget usage, and dependencies against the actual core/extensions/compiler API surface. Use when core or extensions are modified, before releasing create-buntui, or when asked to audit the CLI templates for drift.
---

# check-create-buntui

Audit `packages/create-buntui/` for consistency with `@buntui/core`, `@buntui/extensions`, `@buntui/compiler`, and `@buntui/cli`.

## When to Use

- After modifying core widgets, extensions, or compiler prop maps
- Before releasing/publishing `create-buntui`
- When the user asks to check create-buntui for drift or broken templates
- As a follow-up to `check-widget-props` when CLI templates may be affected

## Architecture Overview

The create-buntui package has two roles:

1. **CLI tool** (`src/apps/main/`) — An interactive TUI (built with buntui itself) that scaffolds new projects. UI: `src/apps/main/App.vue`. There is **no hand-written `main.ts`** — the `@buntui/cli` (`buntui build`) generates the bootstrap entry (`dist/main.js`) from the SFC app, which is referenced by the `bin` field. Supporting source files live in `src/` (`scaffold.ts`, `utils.ts`, `validate.ts`).
2. **Template library** (`templates/`) — Four project templates copied by the scaffold engine. Each template is a self-contained buntui app.

Templates do **not** contain manual `build.ts`/`dev.ts` scripts. They use `buntui.config.ts` + `@buntui/cli` commands (`buntui dev`, `buntui build`, `buntui wasm dev`, `buntui wasm build`).

| Template | Target | Scripts | Has `buntui.config.ts` |
|---|---|---|---|
| `basic` | Native terminal | `buntui dev` / `buntui build` | Yes |
| `sfc` | Native terminal | `buntui dev` / `buntui build` | Yes |
| `full` | Native terminal | `buntui dev` / `buntui build` | Yes |
| `wasm` | Browser (WASM) | `buntui wasm dev` / `buntui wasm build` | Yes (also uses `index.html` + `src/dev-shell.ts` + `src/web-api.ts`) |

## Checklist

Execute ALL checks below. For each check, read the relevant source files, compare, and report PASS/FAIL with specific details.

### 1. Template Widget Tags vs CORE_REGISTRY

**What to check**: Every widget tag used in template `.vue` files must exist in `CORE_REGISTRY` (compiler `runtime-helpers.ts`).

**Steps**:
1. Read `packages/compiler/src/runtime-helpers.ts` to get the current `CORE_REGISTRY` tag list (derive the count dynamically from the source).
2. Grep all `.vue` files under `packages/create-buntui/templates/` for PascalCase HTML tags (`<[A-Z][a-zA-Z]+`).
3. Extract unique tag names and verify each one is either a key in `CORE_REGISTRY` or a `.vue` component import (tags matching a `<script setup>` import from a `.vue` file are child components, not widgets).
4. Report any tags that are NOT in the registry and NOT a `.vue` component import (unknown/broken tags).
5. Also check `packages/create-buntui/src/apps/main/App.vue` — the CLI's own TUI uses core widgets too.

### 2. Template Widget Tags vs EXTENSION_REGISTRY

**What to check**: If any template uses extension widgets, they must have an explicit `<script setup>` import and the sub-path must exist in `@buntui/extensions` exports.

**Steps**:
1. Read `packages/extensions/src/registry.ts` for `EXTENSION_REGISTRY`.
2. Read `packages/extensions/package.json` for the `exports` map (derive valid sub-paths dynamically from the source).
3. Grep template `.vue` and `.ts` files for imports from `@buntui/extensions`.
4. Verify each import path is a valid sub-path export.
5. If `hmr-error-overlay` is imported, verify it uses `mountHmrErrorOverlay` (not a widget creator).

Note: As of current architecture, no template imports from `@buntui/extensions` directly — the CLI handles HMR error overlay internally during `buntui dev`. Templates may still list `@buntui/extensions` in dependencies so users can add extension widgets.

### 3. Template API Imports vs Core Exports

**What to check**: Every import from `@buntui/core` in template files must resolve to an actual export.

**Steps**:
1. Read `packages/core/src/index.ts` to get the full public API surface.
2. Grep all `.ts` and `.vue` files under `packages/create-buntui/templates/` AND `packages/create-buntui/src/` for `from '@buntui/core'` imports.
3. For each named import, verify it is exported from `packages/core/src/index.ts`.
4. Pay special attention to:
   - `createApp` — main entry point (used in wasm `web-api.ts`)
   - `onTick` — lifecycle composable (used in basic/sfc/wasm App.vue)
   - `useApp`, `LOGGER` — used in the CLI's own App.vue
   - `HtmlBackend`, `WasmModule`, `animationFrameScheduler`, `TuiSFCModule`, `TerminalLike` — used in wasm `web-api.ts`
5. Note: `ref`, `computed`, `effect` are imported from `@vue/reactivity` directly (NOT re-exported from `@buntui/core`). Templates correctly use `from '@vue/reactivity'`.

### 4. Template API Imports vs Compiler Exports

**What to check**: Every import from `@buntui/compiler` in template files must resolve to an actual export.

**Steps**:
1. Read `packages/compiler/src/index.ts` for the public API (derive the export list dynamically from the source).
2. Grep template files for `from '@buntui/compiler'` imports.
3. Verify each named import exists.
4. Note: Templates typically don't import from `@buntui/compiler` directly — the `@buntui/cli` handles compilation internally. The wasm template lists `@buntui/compiler` in devDependencies for the CLI's wasm build command.

### 5. Template Dependencies Completeness

**What to check**: Each template's `package.json` must list all packages that the template's code actually imports, and packages must be in the correct section (dependencies vs devDependencies).

**Steps**:
1. There are four templates: `basic`, `sfc`, `full`, `wasm`. Read each `templates/<name>/package.json`.
2. Grep all source files in that template for package imports (`from '@buntui/...'`, `from '@vue/...'`, `from '@xterm/...'`, etc.).
3. Cross-reference: every imported external package must appear in either `dependencies` or `devDependencies`.
4. Placement rules:
   - `@buntui/core`, `@vue/reactivity` — `dependencies` (runtime).
   - `@buntui/cli` — `devDependencies` (build-time only; provides `buntui dev`/`buntui build` commands and `defineConfig`).
   - `vue`, `vue-tsc` — `devDependencies` (type-checking only).
   - `@buntui/native` — `dependencies` for `basic`/`sfc`/`full` (native terminal target). NOT needed for `wasm` (browser target uses WASM, no native binary).
   - `@buntui/extensions` — `dependencies` for `sfc`/`full`/`wasm` (enables users to add extension widgets; not strictly imported by template code but expected by the CLI for HMR overlay). Should NOT be in `basic`.
   - `wasm`-specific: `@xterm/xterm`, `@xterm/addon-fit` in `dependencies`; `vite`, `@buntui/compiler`, `@buntui/native-wasm32-wasi` in `devDependencies`.
5. Version consistency: `@vue/reactivity`, `vue`, `vue-tsc`, `@types/bun`, `typescript` versions should be aligned with the monorepo (check `packages/playground/package.json` and root `package.json` for reference).

### 6. Template Config and Build Commands Validity

**What to check**: Templates must use current `@buntui/cli` command conventions and config setup.

**Steps**:
1. For `basic`, `sfc`, `full` templates:
   - Verify `buntui.config.ts` exists and imports `defineConfig` from `@buntui/cli`.
   - Verify `package.json` scripts use `"dev": "buntui dev"` and `"build": "buntui build"`.
2. For `wasm` template:
   - Verify `package.json` scripts use `"dev": "buntui wasm dev"` and `"build": "buntui wasm build"`.
   - Verify `index.html` exists with a `<div id="terminal">` and module script pointing to `/src/dev-shell.ts`.
   - Verify `src/dev-shell.ts` exists and uses the xterm.js + `createWebApp` pattern.
   - Verify `src/web-api.ts` exists and imports `createApp`, `HtmlBackend`, `WasmModule`, `animationFrameScheduler` from `@buntui/core`.
3. Verify `defineConfig` is exported from `@buntui/cli` (check `packages/cli/src/config.ts`).

Note: The playground (`packages/playground/`) uses the same `buntui.config.ts` + CLI pattern — use it as a reference if available.

### 7. Event Type Correctness in Demos

**What to check**: Event handler parameter types in demo `.vue` files must use global ambient types (from `core/src/global.d.ts`) without import, OR named exports from `@buntui/core` with an explicit import.

**Steps**:
1. Read `packages/core/src/global.d.ts` to identify global event types. These are usable without import. Scan for `type Tui*Event` declarations in the `declare global` block.
2. Read `packages/core/src/index.ts` to identify non-global event types that ARE named exports (look for `export type` of `*EventData` types). These MUST be imported if used.
3. Grep all demo `.vue` files (especially under `templates/full/src/apps/main/components/`) for event type annotations in function parameters.
4. For each type reference, verify:
   - If it's a global type → no import needed, OK.
   - If it's a named core export but NOT global → must have `import type {X} from '@buntui/core'`, otherwise FAIL.
   - If it doesn't exist anywhere → FAIL (unknown type).
5. Common mistake: using `TuiChangeEventData` (non-global union, must be imported, and `.value` access fails on its `{checked: boolean}` arm) instead of the correct global type like `TuiSelectChangeEvent`.

### 8. Missing Widget Demos

**What to check**: The `full` template should demo all core widgets. Report any gaps.

**Steps**:
1. Get the full `CORE_REGISTRY` tag list from `runtime-helpers.ts` (derive count dynamically).
2. List all component files in `templates/full/src/apps/main/components/`.
3. Identify core widgets that are in the registry but have NO demo component. A widget counts as "demoed" if it has a dedicated component file OR is the primary widget in one (e.g., `RadioDemo.vue` demos `RadioGroup`), OR is used meaningfully in `App.vue` (e.g., `SelectButton` for tab navigation).
4. Report widgets with no demo at all as a WARNING.

### 9. Scaffold Version Resolution

**What to check**: `scaffold.ts` must correctly resolve placeholders for template variable substitution.

**Steps**:
1. Read `packages/create-buntui/src/scaffold.ts`.
2. Verify `{{version}}` resolution: it should read the real version from create-buntui's own `package.json` (via `readPackageVersion`), with `'latest'` as fallback.
3. Verify `{{name}}` resolution: it should be set to the user-supplied project name.
4. Verify both placeholders are used consistently across all template files (grep `{{name}}` and `{{version}}` under `templates/`). Expected locations: `package.json` (name + version), `README.md` (name), `App.vue` title strings (name), `index.html` title (wasm only).

### 10. CLI Itself Uses Current API

**What to check**: The CLI's own TUI (`src/apps/main/App.vue`) must use current core APIs. There is no hand-written `main.ts` — the CLI's `buntui build` generates the bootstrap from the SFC app.

**Steps**:
1. Read `packages/create-buntui/src/apps/main/App.vue`.
2. Verify all widget tags used are in `CORE_REGISTRY`.
3. Verify all imports from `@buntui/core` are valid exports (e.g., `useApp`, `LOGGER`).
4. Verify `ref`, `computed` are imported from `@vue/reactivity` (not from `@buntui/core`).
5. Verify `create-buntui`'s own `buntui.config.ts` uses `defineConfig` from `@buntui/cli`.

### 11. Package.json Consistency

**What to check**: `create-buntui`'s own `package.json` must correctly reference workspace packages.

**Steps**:
1. Read `packages/create-buntui/package.json`.
2. Verify:
   - `dependencies` includes `@buntui/core` as `workspace:*`.
   - `dependencies` includes `@buntui/cli` as `workspace:*` (wraps compiler/native/extensions — no need to list them directly).
   - `dependencies` includes `@vue/reactivity`.
   - `bin` field points to the built output (`./dist/main.js`).
   - `files` field includes `dist/` and `templates/`.
   - `scripts` use `buntui dev` / `buntui build` (the CLI builds itself).

## Output Format

After running all checks, produce a structured report:

```
## create-buntui Consistency Report

### PASS
- [x] Check 1: Template widget tags vs CORE_REGISTRY
- [x] Check 3: Template API imports vs core exports
  ...

### FAIL
- [ ] Check 5: Template dependencies completeness
  - `basic` template has `@buntui/cli` in dependencies (should be devDependencies)
  ...

### WARNING
- [~] Check 8: Missing widget demos
  - `SelectButton` has no standalone demo in `full` template
  ...

### SUMMARY
X passed, Y failed, Z warnings
```

## Key Files Reference

| Purpose | Path |
|---|---|
| CLI TUI | `packages/create-buntui/src/apps/main/App.vue` |
| CLI config | `packages/create-buntui/buntui.config.ts` |
| Scaffold engine | `packages/create-buntui/src/scaffold.ts` |
| Version reader | `packages/create-buntui/src/utils.ts` |
| Validation | `packages/create-buntui/src/validate.ts` |
| Templates root | `packages/create-buntui/templates/` |
| Core registry | `packages/compiler/src/runtime-helpers.ts` |
| Extension registry | `packages/extensions/src/registry.ts` |
| Core exports | `packages/core/src/index.ts` |
| Core global types | `packages/core/src/global.d.ts` |
| Extensions exports map | `packages/extensions/package.json` |
| Compiler exports | `packages/compiler/src/index.ts` |
| CLI exports (defineConfig) | `packages/cli/src/config.ts` |
