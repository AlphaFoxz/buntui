import {toArrayBuffer} from 'bun:ffi';
import eventLib from '../extern/events';
import TuiDataView from '../extern/TuiDataViewWrapper';
import {
  TuiEventType, MouseEvent, KeyboardEvent, WheelEvent, TermResizeEvent, type TuiEvent,
  type InferEvent,
} from './types';

const schemaRegistry = new Map<number, new (buffer: ArrayBuffer) => TuiEvent>([
  [TuiEventType.KeyboardEvent, KeyboardEvent],
  [TuiEventType.MouseEvent, MouseEvent],
  [TuiEventType.WheelEvent, WheelEvent],
  [TuiEventType.TermResizeEvent, TermResizeEvent],
]);

class EventBusImpl {
  #running = false;
  readonly #handlers: Record<number, Array<(data: any) => void>> = {};

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

          const SCHEMA_CLASS = schemaRegistry.get(eventType);
          if (!SCHEMA_CLASS) {
            console.warn(`Unknown event type: ${eventType}`);
            throw new Error(`Unknown event type: ${eventType}`);
          }

          const event = new SCHEMA_CLASS(payloadBuf);

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

  on<T extends TuiEventType>(eventType: T, handler: (data: InferEvent<T>) => void) {
    this.#handlers[eventType] ||= [];
    this.#handlers[eventType].push(handler);
  }

  off<T extends TuiEventType>(eventType: T, handler: (data: InferEvent<T>) => void) {
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
