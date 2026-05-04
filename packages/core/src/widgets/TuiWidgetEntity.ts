import type {DrawListBuffer} from '../draw_list/DrawListBuffer';
import type {Mountable} from '../extern/types';
import type {TuiWidgetRect, TuiWidgetSize} from './types';

type WidgetEventHandler = (data: unknown) => void;

export abstract class TuiWidgetEntity implements Mountable {
  #refrenceCount = 0;
  #draggable = false;
  #visible = true;
  readonly #eventHandlers = new Map<string, Set<WidgetEventHandler>>();
  readonly #children: TuiWidgetEntity[] = [];

  get refrenceCount() {
    return this.#refrenceCount;
  }

  get draggable(): boolean {
    return this.#draggable;
  }

  get visible(): boolean {
    return this.#visible;
  }

  get zIndex(): number {
    return 0;
  }

  get rect(): TuiWidgetRect {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  setDraggable(value: boolean): void {
    this.#draggable = value;
  }

  setVisible(value: boolean): void {
    this.#visible = value;
  }

  addChild(child: TuiWidgetEntity): void {
    this.#children.push(child);
    child.mounted();
  }

  removeChild(child: TuiWidgetEntity): void {
    const index = this.#children.indexOf(child);
    if (index !== -1) {
      this.#children.splice(index, 1);
      child.unmounted();
    }
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

  /**
   * Report the widget's natural/content size without external constraints.
   * Return undefined if the widget has no intrinsic size (e.g. Box without explicit dimensions).
   * Used by layout containers (Stack, future Flex/Scroll) to compute child positions.
   */
  intrinsicSize(): TuiWidgetSize | undefined {
    return undefined;
  }

  abstract emitDrawCommands(buf: DrawListBuffer): void;

  /**
   * Propagate a position delta to all children.
   * Called by subclasses in their updateRect when position changes.
   */
  protected propagatePositionDelta(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      return;
    }

    for (const child of this.#children) {
      child.updateRect({
        x: child.rect.x + dx,
        y: child.rect.y + dy,
      });
    }
  }

  /**
   * Render all children. Call at the end of emitDrawCommands in container widgets.
   */
  protected renderChildren(buf: DrawListBuffer): void {
    for (const child of this.#children) {
      if (child.visible) {
        child.emitDrawCommands(buf);
      }
    }
  }
}
