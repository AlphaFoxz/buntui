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

These IDs must be consistent between Zig (`event_bus.zig` EventType enum) and TypeScript (`events/types.ts` EventType enum).

## Three-Step Consumer Protocol

The TS side must follow this protocol exactly:

1. **poll()** - Get a pointer to the next event slot, or `null` if empty
2. **Read data** - Parse the header and payload from the slot's memory
3. **commit()** - Advance the read cursor, freeing the slot

`poll()` and `commit()` must always be paired. If `poll()` returns non-null, `commit()` must be called after processing (even on error), typically in a `finally` block.

## Event Payload Format

Currently, payloads are JSON strings matching Web API signatures:

### KeyboardEvent
```json
{"key":"a","shiftKey":false,"altKey":false,"ctrlKey":false,"metaKey":false,"repeat":false,"charCode":97}
```

### MouseEvent
```json
{"button":"0","buttons":"null","x":23,"y":45,"shiftKey":false,"altKey":false,"ctrlKey":false,"metaKey":false}
```

### WheelEvent (extends MouseEvent)
```json
{"button":"1","buttons":"null","x":23,"y":45,"shiftKey":false,"altKey":false,"ctrlKey":false,"metaKey":false,"wheelDeltaY":-1}
```

Note: `button` and `buttons` fields may be the string `"null"` (not actual null) when not applicable.

## TS EventBus Usage

```typescript
import {EVENT_BUS} from './events';
import {EventType} from './events/types';

// Start consuming
EVENT_BUS.start();

// Subscribe
EVENT_BUS.on(EventType.KeyboardEvent, (event) => {
  console.log(event.key, event.ctrlKey);
});

// Stop consuming
EVENT_BUS.stop();
```

The consumer runs on `setImmediate` loop - it polls continuously while running.

## Zig-side Emission

```zig
const event_bus = @import("./core/event_bus.zig");

// Emit with a byte slice
_ = event_bus.event_bus_emit_bytes(
    @intFromEnum(event_bus.EventType.KeyboardEvent),
    json_string,
);
```

Return codes: `0` = success, `-1` = not initialized, `-2` = queue full or event too large.

## Known Issues

1. **JSON serialization overhead** (IMPROVEMENTS.md P0-3): Currently uses JSON strings, which is CPU-intensive. Planned migration to binary protocol.

2. **Event header size** (IMPROVEMENTS.md P0-1): TS code has historically read 12 bytes instead of 16. The correct size is 16 bytes (`u32 + u32 + u64`).

3. **Global singleton** (IMPROVEMENTS.md P1-6): The event bus is a global variable, not supporting multiple instances. Thread safety is guaranteed by SPSC pattern only.
