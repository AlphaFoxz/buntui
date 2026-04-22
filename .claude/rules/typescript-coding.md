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

Strictly differentiate:

- **`undefined`**: Technical absence. The value is not ready due to technical reasons (pending request, lazy loading, not yet initialized).
- **`null`**: Business logic null. Explicitly part of the domain model (e.g., a user with no avatar).

When designing APIs, use `undefined` for "not provided" and `null` for "intentionally empty".

## Private Fields

Use ECMAScript private fields (`#`) instead of TypeScript `private` keyword:

```typescript
// Correct:
class Foo {
  #value: number;
  get value() { return this.#value; }
}

// Wrong:
class Foo {
  private value: number;
  get value() { return this.value; }
}
```

## Interfaces

### CStruct
All objects passed to FFI as pointers must implement:
```typescript
type CStruct = {
  readonly ptr: Pointer;
  setPtr?: never;
};
```

### Mountable
Widgets that can be mounted to a scene must implement:
```typescript
type Mountable = {
  mounted(): void;
  unmounted(): void;
};
```

### Disposable
Resources requiring cleanup must implement:
```typescript
type Disposable = {
  dispose(disposeWidgets?: boolean): void | Promise<void>;
  [Symbol.dispose](): void;
  [Symbol.asyncDispose](): void;
};
```

## FFI Data Access

When reading/writing binary data for FFI:

1. Create an `ArrayBuffer` of the correct size
2. Get a pointer via `ptr(buffer)` from `bun:ffi`
3. Use `TuiDataViewWrapper` (not `DataView`) for all reads/writes
4. Always specify `littleEndian: true` for multi-byte values (the project uses little-endian throughout)

```typescript
const buffer = new ArrayBuffer(size);
const pointer = ptr(buffer);
const view = new TuiDataViewWrapper(buffer);
view.setUint32(offset, value, true); // true = little-endian
```

## Type Imports

Separate type imports from value imports:

```typescript
import {type Pointer} from 'bun:ffi';
import type {CStruct} from '../types';
```

## Event Type Classes

Events parsed from the FFI event bus use class constructors that accept `Record<string, any>`:

```typescript
class KeyboardEvent {
  constructor(json: Record<string, any>) {
    this.key = json.key as string;
  }
}
```

See `events/types.ts` for existing event classes. All event types should match the Web API signatures (MDN).

## Utility Functions (packages/core/src/utils/ffi.ts)

- `fetchDllPath()` - resolves the native library path
- `assertPtr(ptr)` - validates FFI pointer, throws if null/undefined
- `toCstring(str)` - converts JS string to null-terminated Uint8Array
- `cToString(ptr, len)` - reads a C string from FFI pointer
- `toU8(value)` / `toU16(value)` / `toU32(value)` - validated numeric conversions
- `useOffsetCounter()` - computes struct field offsets with alignment
