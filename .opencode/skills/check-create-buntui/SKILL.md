---
name: check-create-buntui
description: Validate create-buntui scaffolding templates, imports, widget usage, and dependencies against the actual core/extensions/compiler API surface. Use when core or extensions are modified, before releasing create-buntui, or when asked to audit the CLI templates for drift.
---

# check-create-buntui

Audit `packages/create-buntui/` for consistency with `@buntui/core`, `@buntui/extensions`, and `@buntui/compiler`.

## When to Use

- After modifying core widgets, extensions, or compiler prop maps
- Before releasing/publishing `create-buntui`
- When the user asks to check create-buntui for drift or broken templates
- As a follow-up to `check-widget-props` when CLI templates may be affected

## Checklist

Execute ALL checks below. For each check, read the relevant source files, compare, and report PASS/FAIL with specific details.

### 1. Template Widget Tags vs CORE_REGISTRY

**What to check**: Every widget tag used in template `.vue` files must exist in `CORE_REGISTRY` (compiler `runtime-helpers.ts`).

**Steps**:
1. Read `packages/compiler/src/runtime-helpers.ts` to get the current `CORE_REGISTRY` tag list.
2. Grep all `.vue` files under `packages/create-buntui/templates/` for PascalCase HTML tags (`<[A-Z][a-zA-Z]+`).
3. Extract unique tag names and verify each one is a key in `CORE_REGISTRY`.
4. Report any tags that are NOT in the registry (unknown/broken tags).
5. Also check `packages/create-buntui/src/CreateUI.vue` — the CLI's own TUI uses core widgets too.

**Expected core tags** (13 total): `Box`, `Text`, `Input`, `Button`, `Checkbox`, `RadioGroup`, `SelectButton`, `Switch`, `ScrollBox`, `Progress`, `Textarea`, `Table`, `Select`.

### 2. Template Widget Tags vs EXTENSION_REGISTRY

**What to check**: If any template uses extension widgets, they must have an explicit `<script setup>` import and the sub-path must exist in `@buntui/extensions` exports.

**Steps**:
1. Read `packages/extensions/src/registry.ts` for `EXTENSION_REGISTRY`.
2. Read `packages/extensions/package.json` for the `exports` map.
3. Grep template `.vue` files for imports from `@buntui/extensions`.
4. Verify each import path is a valid sub-path export.
5. If `hmr-error-overlay` is imported, verify it uses `mountHmrErrorOverlay` (not a widget creator).

**Known extension sub-paths**: `matrix`, `framerate`, `snake`, `videoplayer`, `logger`, `hmr-error-overlay`.

### 3. Template API Imports vs Core Exports

**What to check**: Every import from `@buntui/core` in template files must resolve to an actual export.

**Steps**:
1. Read `packages/core/src/index.ts` to get the full public API surface.
2. Grep all `.ts` and `.vue` files under `packages/create-buntui/templates/` for `from '@buntui/core'` imports.
3. For each named import, verify it is exported from `packages/core/src/index.ts`.
4. Pay special attention to:
   - `createApp` — main entry point
   - `onTick`, `onMounted`, `onUnmounted` — lifecycle composables
   - `ref`, `computed`, `effect` — reactivity (from `@vue/reactivity` via core re-exports)
   - `defineTheme`, theme names — theme system
   - `useTemplateRef` — template refs

### 4. Template API Imports vs Compiler Exports

**What to check**: Every import from `@buntui/compiler` in template files must resolve to an actual export.

**Steps**:
1. Read `packages/compiler/src/index.ts` (or the main entry) for the public API.
2. Grep template files for `from '@buntui/compiler'` imports.
3. Verify each named import exists. Common imports to check:
   - `compile`, `CORE_REGISTRY`
   - `createDevServer`, `DevServerOptions`
   - Vue plugin / preload helper

### 5. Template Dependencies Completeness

**What to check**: Each template's `package.json` must list all packages that the template's code actually imports.

**Steps**:
1. For each template (`basic`, `sfc`, `full`), read `templates/<name>/package.json`.
2. Grep all source files in that template for package imports (`from '@buntui/...'`, `from 'vue'`, etc.).
3. Cross-reference: every imported external package must appear in either `dependencies` or `devDependencies`.
4. Specific rules:
   - `basic` template should NOT include `@buntui/extensions` (it doesn't use it).
   - `sfc` and `full` templates MUST include `@buntui/extensions` (they import from `hmr-error-overlay`).
   - `@buntui/native` is required in all templates (for `getBinaryPath` in build scripts).
   - `@vue/reactivity` version should match the version used across the monorepo.
   - `vue` and `vue-tsc` should be in devDependencies, not dependencies.

### 6. Template Build Scripts Validity

**What to check**: Template `scripts/build.ts` files must use current build conventions.

**Steps**:
1. Read each template's `scripts/build.ts`.
2. Read the playground's build setup (`packages/playground/scripts/build.ts` or equivalent) for reference.
3. Verify:
   - Uses `@buntui/compiler` `compile()` function correctly.
   - Uses `@buntui/native` `getBinaryPath()` correctly.
   - Build output paths are consistent.
   - No deprecated APIs are used.

### 7. Template dev.ts Validity

**What to check**: Template `src/dev.ts` files must use current dev server API.

**Steps**:
1. Read each template's `src/dev.ts`.
2. Read `packages/playground/src/dev.ts` as reference.
3. Verify:
   - `createDevServer` usage matches current API signature.
   - HMR error overlay setup is correct for `sfc` and `full` templates.
   - `--preload` / plugin setup matches current compiler API.

### 8. Missing Widget Demos

**What to check**: The `full` template should demo all core widgets. Report any gaps.

**Steps**:
1. Get the full `CORE_REGISTRY` tag list from `runtime-helpers.ts`.
2. List all component files in `templates/full/src/components/`.
3. Identify core widgets that are in the registry but have NO demo component.
4. Current demos: Box, Button, Input, Text, Progress, Checkbox, Switch, Radio.
5. Likely missing: `ScrollBox`, `Textarea`, `Table`, `Select`, `SelectButton` (used in App.vue navigation but not as a standalone demo).

Report as a WARNING (not FAIL) since it's acceptable to not demo every widget.

### 9. Scaffold Version Resolution

**What to check**: `scaffold.ts` must correctly resolve the version for template variable substitution.

**Steps**:
1. Read `packages/create-buntui/src/scaffold.ts`.
2. Verify `{{version}}` placeholder resolution strategy.
3. If it hardcodes `'latest'`, note that this means users always get the latest published version (acceptable for alpha, but worth flagging for stable releases).
4. Verify `{{name}}` placeholder is used consistently across all template files.

### 10. CLI Itself Uses Current API

**What to check**: `CreateUI.vue` and `src/index.ts` must use current core APIs.

**Steps**:
1. Read `packages/create-buntui/src/CreateUI.vue`.
2. Verify all widget tags used are in `CORE_REGISTRY`.
3. Verify all imports from `@buntui/core` are valid exports.
4. Read `packages/create-buntui/src/index.ts`.
5. Verify `createApp` import and usage pattern is current.

### 11. Package.json Consistency

**What to check**: `create-buntui`'s own `package.json` must correctly reference workspace packages.

**Steps**:
1. Read `packages/create-buntui/package.json`.
2. Verify:
   - `dependencies` includes `@buntui/core` as `workspace:*`.
   - `devDependencies` includes `@buntui/compiler` and `@buntui/native` as `workspace:*`.
   - `bin` field points to the built output.
   - `files` field includes `dist/` and `templates/`.

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
  - `full` template missing `@buntui/extensions` in dependencies
  ...

### WARNING
- [~] Check 8: Missing widget demos
  - `ScrollBox` has no demo in `full` template
  - `Table` has no demo in `full` template
  ...

### SUMMARY
X passed, Y failed, Z warnings
```

## Key Files Reference

| Purpose | Path |
|---|---|
| CLI entry | `packages/create-buntui/src/index.ts` |
| CLI TUI | `packages/create-buntui/src/CreateUI.vue` |
| Scaffold engine | `packages/create-buntui/src/scaffold.ts` |
| Validation | `packages/create-buntui/src/validate.ts` |
| Templates root | `packages/create-buntui/templates/` |
| Core registry | `packages/compiler/src/runtime-helpers.ts` |
| Extension registry | `packages/extensions/src/registry.ts` |
| Core exports | `packages/core/src/index.ts` |
| Extensions exports map | `packages/extensions/package.json` |
| Compiler exports | `packages/compiler/src/index.ts` |
