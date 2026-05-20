---
paths:
  - "packages/core/**"
  - "packages/compiler/**"
  - "packages/playground/**"
  - "packages/extensions/**"
  - "packages/buntui/**"
---

# TypeScript Coding Rules

Rules for writing TypeScript code in packages/core/, packages/compiler/, packages/playground/, packages/extensions/, and packages/buntui/.

## XO Lint Restrictions

These are enforced by `xo.config.ts` but listed here for clarity:

- **Never** use `DataView` directly. Use `TuiDataViewWrapper` from `extern/TuiDataViewWrapper.ts`.
- **Never** use `Buffer`. Use `Uint8Array`.
- **Never** use `object` as a type. Use `Record<string, unknown>`.
- **Never** use empty array type `[]`. Always specify the element type: `SomeType[]`.
- Variable names: `camelCase` or `UPPER_CASE`. Leading/trailing underscores allowed.
- Filenames: `kebab-case`, `camelCase`, or `PascalCase` are all acceptable.
- Indentation: 2 spaces.
- Bitwise operators: allowed (`no-bitwise` is off).

## Null vs Undefined Philosophy

- **`undefined`**: Technical absence — value not ready (pending request, lazy loading, not yet initialized).
- **`null`**: Business logic null — explicitly part of the domain model.

## Private Fields

Use ECMAScript private fields (`#`) instead of TypeScript `private` keyword.

## Interfaces

- **CStruct**: Type alias for objects passed to FFI as pointers (`readonly ptr: Pointer`). Defined in `extern/types.ts`.
- **Mountable**: Type alias for widgets mounted to a scene (`mounted()` / `unmounted()`). Defined in `extern/types.ts`.

## Type Imports

Separate type imports from value imports:

```typescript
import {type Pointer} from 'bun:ffi';
import type {CStruct} from '../types';
```

## DrawList Widget Pattern

Each widget implements `emitDrawCommands(buf: DrawListBuffer)`:

```typescript
override emitDrawCommands(buf: DrawListBuffer): void {
  const {x, y, width, height} = this.rect;
  buf.pushClip(x, y, width, height);
  buf.drawRect({x, y, width, height, bgRgba: this.color.colorBg});
  buf.drawText({x, y, text: this.text, fgRgba: this.color.colorFg, bgRgba: this.color.colorBg});
  buf.popClip();
}
```

## Binary Data Access (DrawListBuffer)

`DrawListBuffer` internally uses `TuiDataViewWrapper` to write command headers and payloads into a shared `ArrayBuffer`. Widget code calls high-level methods (`drawRect`, `drawText`, etc.) — never write binary data directly.

## Event Type Classes

Events parsed from the FFI event bus use class constructors that accept `ArrayBuffer` (binary payload parsed with `TuiDataViewWrapper`). See `events/types.ts` for existing event classes. All event types should match Web API signatures (MDN). Modifier bitmasks must match Zig `core/event_payloads.zig`.
