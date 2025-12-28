# Readme

## About rasterization

TODO Waiting for designing

## zig naming rules

### functions

- Use camelCase
- **A APPLYING FUNCTION MUST BE PAIRED TO A RELEASING FUNCTION**. Such as:
  - `create`Object() and `destroy`Object()
  - `init`Source() and `deinit`Source()
  - `open`Streaming() and `close`Streaming()
  - `connect`() and `disconnect`()
  - `lock`() and `unlock`()
  - `alloc`One() and `free`Arr() / `destroy`One()
  - `register`() and `unregister`()
  - `load`() and `unload`()
  - `start`() and `stop`()
  - `enter`() and `exit`()

### variables

- Naming local variables using snake_case
- Naming global variables using SCREAMING_SNAKE_CASE
- Naming function using camelCase
- Naming struct using PascalCase

## undefined and null

Diffrentiate strictly betten undefined and null
`undefined` is a technology empty
`null` is a business empty

### ts types

- undefined: Means "This value not ready yet just because of technical reason", such as a pending request / lazy loading whatever.
- null: Means "This value precisely can be null in the business logic", not user's optional argument, ONE OF BUSINESS VALUE IS `null`, orelse I need to define a type like

```typescript
type ParseResult<File> = Bolb | string | 'Some thing wrong with io, so it must be null! Not undefined, I have tried!'
```

### zig types

- undefined: Means "This value not ready yet just because of memory layout reason".
- null: Optional value.`var serch_result: ?usize = null;`.

## zig atomic

### .unordered

### .monotonic

### .acquire

### .release

### .acq_rel

### .seq_cst

## todolist

- [ ] Screen saver animations
- [ ] Better event system
- [ ] Draggable widgets
- [ ] Custom input system
- [ ] Frame checking at last
