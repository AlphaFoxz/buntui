# Compiler Test Audit

Date: 2026-05-17

Current state: 4 test files, 108 cases, 228 assertions, all passing.

## 1. Functional Gaps (no tests because the feature doesn't exist yet)

These are compiler features that Vue SFC supports but buntui does not. Implementing them requires source code changes first, then tests.

### 1.1 `v-on` modifiers

Vue supports `@click.stop`, `@key.enter`, etc. The TUI use case (keyboard shortcuts like `@key.enter`, `@key.escape`) is extremely common but currently unsupported.

### 1.3 `v-model` with argument

Vue 3 supports `v-model:title="x"` (named v-model). Currently only bare `v-model` is handled.

### 1.4 `defineProps` / `defineEmits`

Vue 3 `<script setup>` compiler macros for type-safe component prop/event declarations. No compiler support exists.

### 1.5 `computed` integration

`RUNTIME_HELPERS` includes `COMPUTED`, but no compiler logic generates or distinguishes `computed` from `ref`.

## 2. Untested Modules

### 2.1 `parse.ts` — 0 tests

SFC parser has no standalone tests. Missing coverage:
- Error handling (multiple `<template>` blocks, malformed SFC, nested `<script>`)
- Edge cases (empty template content, template with only whitespace, BOM in source)

### 2.2 `dev-server.ts` — 0 tests (344 lines)

HMR, child component discovery (`discoverVueFiles`), incremental reload, temporary file management — all untested. This is the core of the developer experience.

## 3. Weak Spots in Existing Tests

### 3.1 `wrapConditionExpr` complex expressions

Only tested with `&&`, `===`, property access. Missing:
- Ternary expressions `a ? b : c`
- Function calls `fn()`
- Array index `arr[0]`
- Numeric literals in comparisons `count > 0` (numbers should not be wrapped in `unref`)
- Template literals `` `hello ${name}` ``
- Negation `!flag`

### 3.2 Component nesting under v-if / v-for

No tests for:
- `.vue` component nested inside `v-if` block
- `v-for` containing `.vue` components
- Multi-level component nesting with cleanup function chains
- Component with `v-show` inside `v-for`

### 3.3 `splitScript` edge cases

Only basic coverage (with/without imports, empty script). Missing:
- Multi-line import with complex destructuring
- Dynamic `import()` expressions (not statement-starting)
- Type-only imports `import type { Foo }`
- Re-exports `export { x } from 'y'`

### 3.4 Error paths

Only 2 error cases tested (unknown tag, broken SFC). Missing:
- `v-for` without expression
- `v-if` without expression
- `v-else-if` not immediately after `v-if`
- Duplicate `v-else`
- Invalid `v-model` expression like `v-model="fn()"`

### 3.5 Real-world end-to-end compilation

No test combining multiple features in a realistic SFC:

```vue
<script setup>
import {ref, computed} from '@vue/reactivity'
const count = ref(0)
const double = computed(() => count.value * 2)
</script>
<template>
  <Box :x="1" :y="1">
    <Text :value="String(count)"/>
    <Text v-if="count > 5" value="big"/>
    <Text v-for="n in 10" :value="String(n)"/>
  </Box>
</template>
```

## 4. Priority Recommendations

Ordered by impact on "Vue-like experience":

| Priority | Item | Rationale |
|----------|------|-----------|
| P0 | `parse.ts` tests | Parser is the pipeline entry point |
| P1 | `dev-server.ts` tests | HMR is critical for developer experience |
| P1 | `v-on` modifiers | Keyboard events are core to TUI |
| P1 | `wrapConditionExpr` hardening | Users will write complex reactive expressions |
| P2 | `defineProps` / `defineEmits` | Needed for real component composition |
| P2 | `v-model` with argument | Nice-to-have for multi-bindable widgets |
| P2 | End-to-end real-world scenarios | Validates feature integration |
| P3 | `computed` compiler integration | Optimization, not blocking |
