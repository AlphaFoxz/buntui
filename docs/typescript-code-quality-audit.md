# TypeScript Code Quality Audit

Date: 2026-05-20 (updated)

## 1. Design Issues

### 1.1 Hardcoded global 'q' quit handler

**File:** `packages/core/src/app/TuiApp.ts:81-87`

Every TUI app unconditionally quits when 'q' is pressed, regardless of focus state. Typing 'q' in an input field also quits the app. No way to disable or configure.

```ts
EVENT_BUS.on(TuiEventType.KeyboardEvent, (data) => {
  if (data.key === 'q' || data.key === 'Q') {
    setTimeout(() => {
      this.stop()
    })
  }
})
```

**Fix:** Make configurable via options (e.g., `quitKey?: string | false`), or remove and let application code register its own quit handler.
