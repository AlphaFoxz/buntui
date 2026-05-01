---
paths:
  - "packages/core/**"
  - "packages/compiler/**"
  - "packages/playground/**"
  - "packages/extensions/**"
  - "packages/buntui/**"
---

# TypeScript Coding Rules

Rules for writing TypeScript code in packages/core/, packages/compiler/, and packages/playground/.

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

- **CStruct**: Objects passed to FFI as pointers (`readonly ptr: Pointer`).
- **Mountable**: Widgets mounted to a scene (`mounted()` / `unmounted()`).

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
  const {rectX, rectY, rectWidth, rectHeight} = this.rect;
  const {colorFg, colorBg} = this.color;
  buf.pushClip(rectX, rectY, rectWidth, rectHeight);
  buf.drawRect(rectX, rectY, rectWidth, rectHeight, colorBg);
  buf.drawText(rectX, rectY, this.text, colorFg, colorBg);
  buf.popClip();
}
```

## Binary Data Access (DrawListBuffer)

`DrawListBuffer` internally uses `TuiDataViewWrapper` to write command headers and payloads into a shared `ArrayBuffer`. Widget code calls high-level methods (`drawRect`, `drawText`, etc.) — never write binary data directly.

## Event Type Classes

Events parsed from the FFI event bus use class constructors that accept `ArrayBuffer` (binary payload parsed with `TuiDataViewWrapper`). See `events/types.ts` for existing event classes. All event types should match Web API signatures (MDN). Modifier bitmasks must match Zig `core/event_payloads.zig`.
