# ECS Component System

The TypeScript side uses an Entity-Component-System pattern for widget management.

## Core Types

### Entity
```typescript
type Entity = {
  readonly id: bigint;
  setId?: never;
};
```

### CStruct
```typescript
type CStruct = {
  readonly ptr: Pointer;
  setPtr?: never;
};
```

### Mountable
```typescript
type Mountable = {
  mounted(): void;
  unmounted(): void;
};
```

## ECS Manager

`ECS_MANAGER` (packages/core/src/extern/widgets/EcsManager.ts) is a global singleton that manages entity IDs and component storage.

Key methods:
- `createEntity(): bigint` - returns a unique entity ID
- `registerRectComponent(entityId, rect): number` - registers a component, returns pointer
- `fetchRectComponent(entityId): TuiWidgetRect` - reads component data
- `updateRectComponent(entityId, partial): void` - updates component fields

Each component type has its own register/fetch/update methods following the same pattern.

## TuiWidgetEntity

Base abstract class (packages/core/src/extern/widgets/TuiWidgetEntity.ts).

All widget entities:
1. Inherit from `TuiWidgetEntity`
2. Allocate an `ArrayBuffer` sized by `useOffsetCounter()`
3. Store entity ID and component mask in the buffer
4. Expose `ptr` (via `CStruct`) and `mounted()/unmounted()` (via `Mountable`)

## Memory Layout

Entity buffer layout is computed by `useOffsetCounter()`:

```typescript
const OFFSET_COUNTER = useOffsetCounter();
const OFFSETS = {
  id:     OFFSET_COUNTER.mark('u64'),         // 8 bytes
  mask:   OFFSET_COUNTER.mark('u32'),         // 4 bytes (ComponentType)
  rect:   OFFSET_COUNTER.mark('pointer'),     // 8 bytes
  color:  OFFSET_COUNTER.mark('pointer'),     // 8 bytes
  style:  OFFSET_COUNTER.mark('pointer'),     // 8 bytes
  border: OFFSET_COUNTER.mark('pointer'),     // 8 bytes
  shadow: OFFSET_COUNTER.mark('pointer'),     // 8 bytes
  text:   OFFSET_COUNTER.mark('pointer'),     // 8 bytes
};
```

Alignment: each field is aligned to `min(fieldSize, 8)` bytes.

## Component Mask

A 32-bit bitmask stored at `OFFSETS.mask`. Each bit represents a registered component:

```typescript
enum TuiWidgetComponentType {
  Rect   = 0x0001,
  Color  = 0x0002,
  Style  = 0x0004,
  Border = 0x0008,
  Shadow = 0x0010,
  Text   = 0x0020,
}
```

When registering a component, OR the mask:
```typescript
const mask = this.#dataView.getUint32(OFFSETS.mask, true);
this.#dataView.setUint32(OFFSETS.mask, mask | TuiWidgetComponentType.Rect, true);
```

## Component Sizes

Defined in `TUI_WIDGET_COMPONENT_MEM_USAGE`:

| Component | Size (bytes) | Fields |
|-----------|-------------|--------|
| ComponentType (mask) | 4 | u32 |
| Rect | 8 | x:u16, y:u16, w:u16, h:u16 |
| Color | 8 | fg:u32, bg:u32 |
| Style | 4 | zIndex:i16, modifier:u16 |
| Border | 12 | color:u32, style:u8, top:bool, right:bool, bottom:bool, left:bool |
| Shadow | 12 | offsetX:u16, offsetY:u16, color:u32, covered:bool |
| Text | 8 | pointer to string data |

These sizes must match the Zig-side struct definitions exactly.

## Component Registration Pattern

Each component follows the same three-method pattern in `TuiWidgetEntity`:

```typescript
// 1. Register: write component data to ECS manager + update pointer and mask in entity buffer
protected registerRectComponent(rect: TuiWidgetRect) {
  this.#dataView.setBigUint64(OFFSETS.rect,
    BigInt(ECS_MANAGER.registerRectComponent(this.#entityId, rect)), true);
  const mask = this.#dataView.getUint32(OFFSETS.mask, true);
  this.#dataView.setUint32(OFFSETS.mask, mask | TuiWidgetComponentType.Rect, true);
}

// 2. Fetch: read component data from ECS manager
protected fetchRectComponent() {
  return ECS_MANAGER.fetchRectComponent(this.#entityId);
}

// 3. Update: modify component data in ECS manager
protected updateRectComponent(rect: Partial<TuiWidgetRect>) {
  ECS_MANAGER.updateRectComponent(this.#entityId, rect);
}
```

## Adding a New Component Type

1. Define the TS type in `packages/core/src/extern/widgets/types.ts`
2. Add size to `TUI_WIDGET_COMPONENT_MEM_USAGE`
3. Add a new `TuiWidgetComponentType` enum value (next power of 2)
4. Add register/fetch/update methods to `EcsManager`
5. Add a `useOffsetCounter().mark(...)` entry in `TuiWidgetEntity` for the pointer field
6. Add `register*Component()`, `fetch*Component()`, `update*Component()` protected methods to `TuiWidgetEntity`
7. Define the matching Zig `extern struct` in `packages/native/src/core/widgets/component.zig`
8. Verify the byte size matches between TS and Zig
