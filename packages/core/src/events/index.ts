import {type TuiBackend, type TuiBackendEventHandler} from '../app/TuiBackend';
import {type TuiEventType, type InferEvent, type TuiEvent} from './types';

class EventBusImpl {
  readonly #handlers: Record<number, Array<(data: any) => void>> = {};
  #backend: TuiBackend | undefined;

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

  attach(backend: TuiBackend): void {
    this.#backend = backend;
  }

  start(): void {
    if (!this.#backend) {
      throw new Error('EventBus: no backend attached. Call attach() before start().');
    }

    this.#backend.startEvents(this.#handleEvent);
  }

  stop(): void {
    this.#backend?.stopEvents();
    this.#backend = undefined;
  }

  readonly #handleEvent: TuiBackendEventHandler = (eventType: number, event: TuiEvent) => {
    const handlers = this.#handlers[eventType];
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
  };
}

export const EVENT_BUS = new EventBusImpl();
