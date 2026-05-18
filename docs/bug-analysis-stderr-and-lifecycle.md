# Bug Analysis: stderr leak & onMounted/onUnmounted not firing

## Bug 1: Errors still output to terminal instead of Logger

### Symptom

Runtime errors (e.g. `Cannot read "clipboard"`) print directly onto the TUI canvas, corrupting the display. They do NOT appear in the log file.

### Root cause analysis

The stderr interception was added in `TuiApp.start()` via monkey-patching `process.stderr.write`. However this has a critical flaw:

**The error occurs BEFORE `start()` is called**, or occurs through a code path that bypasses `process.stderr.write`.

There are several scenarios where errors leak:

1. **Bun's default uncaught exception handler**: When `uncaughtException` fires, Bun's runtime prints the error to stderr **before** calling our handler. Our `process.on('uncaughtException', ...)` handler logs the error and calls `dispose()`, but Bun has already written the raw error to the terminal by that point. The `stderr.write` interception may help for some errors, but Bun's internal error formatting writes directly to the fd, bypassing the JS-level `process.stderr.write` method.

2. **`console.log` / `console.error` inside SFC user code**: The ButtonDemo uses `console.log(...)` (line 25, 30, 33 of ButtonDemo.vue). These write to **stdout**, not stderr. Our interception only covers `process.stderr.write`, not `process.stdout.write`. So user `console.log` calls output directly to the terminal.

3. **Errors thrown during `import` / module evaluation**: If a module-level error occurs during `Bun.plugin()` or during dynamic import evaluation, it happens before `TuiApp` is even instantiated, so no interception is in place.

### Proposed fix

**Intercept both `process.stdout.write` and `process.stderr.write`** in `TuiApp.start()`:

- `stdout.write` → route to `LOGGER.logInfo()` (catches `console.log` from user code)
- `stderr.write` → route to `LOGGER.logError()` (catches `console.error`, runtime errors)

Additionally, for `uncaughtException` / `unhandledRejection`, we should **also suppress Bun's default error output**. The `process.on('uncaughtException')` handler already exists, but Bun may still print the error before our handler runs. We need to verify whether Bun's behavior can be fully suppressed or if we need to wrap all entry points in try/catch.

### Files to modify

- `packages/core/src/app/TuiApp.ts` — intercept `stdout` + `stderr`, ensure both go to `LOGGER`
- `packages/core/src/app/NativeBackend.ts` — already fixed (`console.warn/error` → `LOGGER`)
- `packages/core/src/app/RenderLoop.ts` — already fixed (try/catch in loop)

### Key uncertainty

Need to verify if Bun writes uncaught exceptions to stderr via the JS `process.stderr.write` method (which we intercept) or via a lower-level C API call (which we can't intercept from JS). If it's the latter, we may need a different approach such as wrapping all user code entry points.

---

## Bug 2: `onMounted` / `onUnmounted` not firing in SFC components

### Symptom

In ButtonDemo.vue, `onTick` works correctly, but `onMounted` and `onUnmounted` callbacks never execute.

### Root cause analysis

The ButtonDemo.vue imports `onMounted` and `onUnmounted` from **`'vue'`**:

```ts
import { onMounted, onUnmounted } from 'vue'
```

But the buntui framework provides these composables from **`'@buntui/core'`**:

```ts
import { onMounted, onUnmounted } from '@buntui/core'
```

The `vue` package does not exist as a dependency in this project. Even if it did, Vue's lifecycle hooks (`onMounted`, `onUnmounted`) work with Vue's internal component instance context, which buntui's compiled SFC code does not set up. Buntui uses `@vue/reactivity` (just the reactivity primitives like `ref`, `effect`, `computed`) — not Vue's full runtime with component lifecycle.

Looking at the compiled output of ButtonDemo.vue:

```ts
import { onMounted, onUnmounted } from 'vue'  // ← this is a dead import

export function setup(__scene) {
  // ...
  onMounted(() => {          // ← calls vue's onMounted, which does nothing
      console.log('组件已挂载')
  })
  onUnmounted(() => {        // ← calls vue's onUnmounted, which does nothing
      console.log('组件已卸载')
  })
  // ...
}
```

The call goes to `vue`'s `onMounted`, which requires a Vue component instance to be active (via `setCurrentInstance`). Since buntui never sets up Vue's component instance system, these calls silently do nothing (or throw, which is caught by the error interception).

Even if the user corrects the import to `@buntui/core`, there is a **second problem**: how the component's `setup()` is invoked.

Looking at Demo.vue's compiled output, ButtonDemo is inside a `v-if`:

```ts
let _buttondemo2 = null;
effect(() => {
  if (unref(currentTab) === 'Button') {
    if (!_buttondemo2) {
      _buttondemo2 = __runSetup(__scene, () => ButtonDemo.setup(__scene));
    }
  } else {
    if (_buttondemo2) {
      _buttondemo2();     // cleanup → triggers onUnmounted
      _buttondemo2 = null;
    }
  }
});
```

This part looks correct — `__runSetup` will:
1. Call `ButtonDemo.setup(__scene)` which sets up the scene context
2. Inside setup, `onMounted(cb)` registers the callback in the mounted queue
3. After setup returns, `__runSetup` flushes the mounted queue → `onMounted` fires
4. The cleanup function captures `onUnmounted` callbacks via `trackInScope`

**But the user is importing from `'vue'`, not `'@buntui/core'`**, so the `onMounted`/`onUnmounted` that get called are Vue's no-op versions.

### Proposed fix

This is primarily a **user error** (wrong import source), but we should make the framework more robust:

1. **Document the correct import**: `onMounted`/`onUnmounted` must come from `@buntui/core`, not `vue`
2. **Detect wrong imports in the compiler**: During compilation, if we see `import { onMounted, onUnmounted } from 'vue'`, emit a warning or auto-redirect to `@buntui/core`
3. **Alternatively**: Have the compiler automatically inject `onMounted`/`onUnmounted` imports from `@buntui/core` when it detects usage of these names in the script body (similar to how core widget creators are auto-imported via the registry)

### Files to modify

- `packages/compiler/src/compile.ts` — detect `onMounted`/`onUnmounted`/`onTick` imports from `'vue'` and rewrite to `'@buntui/core'`
- OR: `packages/playground/src/components/ButtonDemo.vue` — fix the import (if we treat this as a user docs issue only)

---

## Priority

1. **Bug 1 first** — errors corrupting the TUI is a framework-level issue affecting all users
2. **Bug 2 second** — this is partially a user error (wrong import), but the compiler should ideally prevent it
