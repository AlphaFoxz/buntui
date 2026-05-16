# Event System

The event system bridges Zig (producer) and TypeScript (consumer) through a lock-free ring buffer.

## Architecture

```
Zig Input Handler --> emit() --> Ring Buffer --> poll() --> TS EventBus --> handlers
                                    ^                          |
                                    |_______ commit() _________|
```

- **Producer**: Zig input handlers (single thread, writes events)
- **Consumer**: TypeScript event loop (single thread, reads events)
- **Buffer**: Lock-free SPSC (Single-Producer Single-Consumer) ring queue

## Ring Buffer Configuration

Defined in `packages/native/src/core/event_bus.zig`:

- **Slot size**: 256 bytes each
- **Queue size**: 1024 slots (must be power of 2)
- **Queue mask**: `QUEUE_SIZE - 1` (for fast modulo via bitwise AND)

## Event Header Layout

Each slot starts with a 16-byte header:

```
Offset  Size  Field         Zig Type  Description
0       4     event_type    u32       Event type ID
4       4     payload_len   u32       Actual payload length in bytes
8       8     sequence      u64       Monotonically increasing sequence number
```

The remaining 240 bytes (256 - 16) are available for payload data.

## Event Types

| ID | Enum Name       | TS Class         | Description    |
|----|-----------------|------------------|----------------|
| 1  | KeyboardEvent   | KeyboardEvent    | Key press/release |
| 2  | MouseEvent      | MouseEvent       | Mouse click/move |
| 3  | WheelEvent      | WheelEvent       | Scroll wheel    |
| 4  | TermResizeEvent | TermResizeEvent  | Terminal resize |

These IDs must be consistent between Zig (`event_bus.zig` EventType enum) and TypeScript (`events/types.ts` TuiEventType const object).

## Three-Step Consumer Protocol

The TS side must follow this protocol exactly:

1. **poll()** - Get a pointer to the next event slot, or `null` if empty
2. **Read data** - Parse the header and payload from the slot's memory
3. **commit()** - Advance the read cursor, freeing the slot

`poll()` and `commit()` must always be paired. If `poll()` returns non-null, `commit()` must be called after processing (even on error), typically in a `finally` block.

## Event Payload Format

Payloads are binary, parsed on the TS side from `ArrayBuffer` using `TuiDataViewWrapper`. Modifier bitmasks must match Zig `core/event_payloads.zig`.

### KeyboardEvent (binary layout)

```
[modifiers:u8] [char_code:u16 LE] [key_len:u8] [key_bytes:u8*key_len]
```

Modifier bitmask: Shift=0x01, Ctrl=0x02, Alt=0x04, Meta=0x08, Repeat=0x10.

### MouseEvent (binary layout)

```
[modifiers:u8] [flags:u8] [button:u8] [buttons:u8] [x:u16 LE] [y:u16 LE]
```

Flags bitmask: HAS_BUTTON=0x01, HAS_BUTTONS=0x02, IS_RELEASE=0x10. `button`/`buttons` are `undefined` when their flag is not set.

### WheelEvent (binary layout)

Same as MouseEvent (8 bytes) + `[wheel_delta_y:i8]`.

### TermResizeEvent (binary layout)

`[rows:u16 LE] [cols:u16 LE]`

## TS EventBus Usage

```typescript
import {EVENT_BUS} from './events';
import {TuiEventType} from './events/types';

// Start consuming
EVENT_BUS.start();

// Subscribe
EVENT_BUS.on(TuiEventType.KeyboardEvent, (event) => {
  console.log(event.key, event.ctrlKey);
});

// Stop consuming
EVENT_BUS.stop();
```

The consumer runs on `setImmediate` loop - it polls continuously while running.

## Zig-side Emission

```zig
const event_bus = @import("./core/event_bus.zig");

// Emit binary payload
_ = event_bus.event_bus_emit_bytes(
    @intFromEnum(event_bus.EventType.KeyboardEvent),
    payload_bytes,
);
```

Return codes: `0` = success, `-1` = not initialized, `-2` = queue full or event too large.

## Known Issues

1. **Global singleton**: The event bus is a global variable, not supporting multiple instances. Thread safety is guaranteed by SPSC pattern only.
