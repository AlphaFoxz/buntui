import type {Mountable} from '../types';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {TuiWidgetRect} from './types';

type WidgetEventHandler = (data: unknown) => void;

export abstract class TuiWidgetEntity implements Mountable {
  #refrenceCount = 0;
  #draggable = false;
  readonly #eventHandlers = new Map<string, Set<WidgetEventHandler>>();

  get refrenceCount() {
    return this.#refrenceCount;
  }

  get draggable(): boolean {
    return this.#draggable;
  }

  get zIndex(): number {
    return 0;
  }

  get rect(): TuiWidgetRect {
    return {
      rectX: 0,
      rectY: 0,
      rectWidth: 0,
      rectHeight: 0,
    };
  }

  setDraggable(value: boolean): void {
    this.#draggable = value;
  }

  updateRect(_rect: Partial<TuiWidgetRect>): void {
    // Default no-op — subclasses override with actual implementation
  }

  containsPoint(x: number, y: number): boolean {
    void x;
    void y;
    return false;
  }

  on(event: string, handler: WidgetEventHandler): void {
    let handlers = this.#eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.#eventHandlers.set(event, handlers);
    }

    handlers.add(handler);
  }

  off(event: string, handler: WidgetEventHandler): void {
    this.#eventHandlers.get(event)?.delete(handler);
  }

  dispatch(eventType: string, data: unknown): void {
    const handlers = this.#eventHandlers.get(eventType);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  mounted() {
    this.#refrenceCount++;
  }

  unmounted(): void {
    this.#refrenceCount--;
    if (this.#refrenceCount <= 0) {
      this.#eventHandlers.clear();
    }
  }

  abstract emitDrawCommands(buf: DrawListBuffer): void;
}
