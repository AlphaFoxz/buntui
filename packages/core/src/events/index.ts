import {toArrayBuffer} from 'bun:ffi';
import eventLib from '../extern/events';
import TuiDataView from '../extern/TuiDataViewWrapper';
import {
  EventType, MouseEvent, KeyboardEvent, WheelEvent, type TuiEvent,
} from './types';

const schemaRegistry = new Map<number, new (json: Record<string, unknown>) => TuiEvent>([
  [EventType.KeyboardEvent, KeyboardEvent],
  [EventType.MouseEvent, MouseEvent],
  [EventType.WheelEvent, WheelEvent],
]);

const decoder = new TextDecoder('utf-8');

class EventBusImpl {
  #running = false;
  readonly #handlers: Record<number, Array<(data: TuiEvent) => void>> = {};

  start() {
    this.#running = true;

    const consume = () => {
      if (!this.#running) {
        return;
      }

      const slotPtr = eventLib.event_bus_poll();

      if (slotPtr !== null) {
        try {
          // 读取事件头（前16字节）
          const headerBuf = toArrayBuffer(slotPtr, 0, 16);
          const headerView = new TuiDataView(headerBuf);
          const eventType = headerView.getUint32(0, true);
          const payloadLength = headerView.getUint32(4, true);

          const payloadBuf = toArrayBuffer(slotPtr, 16, payloadLength);

          const jsonString = decoder.decode(payloadBuf);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- JSON.parse returns any, validated by event constructors
          const json: Record<string, unknown> = JSON.parse(jsonString);
          const SCHEMA_CLASS = schemaRegistry.get(eventType);
          if (!SCHEMA_CLASS) {
            console.warn(`Unknown event type: ${eventType}`);
            throw new Error(`Unknown event type: ${eventType}`);
          }

          const event = new SCHEMA_CLASS(json);

          const handlers = this.#handlers[eventType];
          if (handlers) {
            for (const handler of handlers) {
              handler(event);
            }
          }
        } catch (error) {
          console.error('Event parse error:', error);
        } finally {
          eventLib.event_bus_commit();
        }
      }

      setImmediate(consume);
    };

    consume();
  }

  stop() {
    this.#running = false;
  }

  on(eventType: EventType.MouseEvent, handler: (data: MouseEvent) => void): void;
  on(eventType: EventType.KeyboardEvent, handler: (data: KeyboardEvent) => void): void;
  on(eventType: EventType.WheelEvent, handler: (data: WheelEvent) => void): void;
  on(eventType: EventType, handler: (data: any) => void) {
    this.#handlers[eventType] ||= [];
    this.#handlers[eventType].push(handler);
  }

  off(eventType: EventType, handler: (data: TuiEvent) => void) {
    const handlers = this.#handlers[eventType];
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }
}

export const EVENT_BUS = new EventBusImpl();
