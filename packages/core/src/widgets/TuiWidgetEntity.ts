import {extractPercentSpec, isPercent} from '../utils/percent';
import type {DrawListBuffer} from '../draw_list/DrawListBuffer';
import type {Mountable} from '../extern/types';
import type {KeyboardEvent, MouseEvent, WheelEvent} from '../events/types';
import type {
  TuiSizeValue,
  TuiWidgetPercentSpec,
  TuiWidgetRect,
  TuiWidgetSize,
} from './types';

export type TuiWidgetEventData = {
  click: MouseEvent;
  mousedown: MouseEvent;
  mouseup: MouseEvent;
  mouseover: MouseEvent;
  mouseout: MouseEvent;
  mousemove: MouseEvent;
  contextmenu: MouseEvent;
  dragstart: MouseEvent;
  drag: MouseEvent;
  dragend: MouseEvent;
  wheel: WheelEvent;
  key: KeyboardEvent;
  focus: undefined;
  blur: undefined;
  input: {value: string};
  submit: {value: string};
  copy: {text: string};
  cut: {text: string};
  paste: {text: string};
  undo: {value: string};
  redo: {value: string};
  change: {checked: boolean} | {value: number; label: string} | {value: string; label: string};
};

type WidgetEventHandler = (data: unknown) => void;

export abstract class TuiWidgetEntity implements Mountable {
  #referenceCount = 0;
  #draggable = false;
  #visible = true;
  #parent: TuiWidgetEntity | null = null;
  readonly #eventHandlers = new Map<string, Set<WidgetEventHandler>>();
  readonly #children: TuiWidgetEntity[] = [];
  #percentSpec: TuiWidgetPercentSpec | undefined = undefined;
  #propagationStopped = false;

  get hasPercentLayout(): boolean {
    return this.#percentSpec !== undefined;
  }

  setPercentSpec(spec: TuiWidgetPercentSpec): void {
    this.#percentSpec = spec;
  }

  clearPositionPercentSpec(): void {
    if (!this.#percentSpec) {
      return;
    }

    delete this.#percentSpec.x;
    delete this.#percentSpec.y;
    if (this.#percentSpec.width === undefined && this.#percentSpec.height === undefined) {
      this.#percentSpec = undefined;
    }
  }

  resolveLayout(parentWidth: number, parentHeight: number): void {
    if (!this.#percentSpec) {
      return;
    }

    const updates: Partial<TuiWidgetRect> = {};
    const spec = this.#percentSpec;
    if (spec.x !== undefined) {
      updates.x = this.#resolvePercent(spec.x, parentWidth);
    }

    if (spec.y !== undefined) {
      updates.y = this.#resolvePercent(spec.y, parentHeight);
    }

    if (spec.width !== undefined) {
      updates.width = this.#resolvePercent(spec.width, parentWidth);
    }

    if (spec.height !== undefined) {
      updates.height = this.#resolvePercent(spec.height, parentHeight);
    }

    if (Object.keys(updates).length > 0) {
      this.updateRect(updates);
    }
  }

  get referenceCount() {
    return this.#referenceCount;
  }

  get draggable(): boolean {
    return this.#draggable;
  }

  get visible(): boolean {
    return this.#visible;
  }

  get children(): readonly TuiWidgetEntity[] {
    return this.#children;
  }

  get parent(): TuiWidgetEntity | null {
    return this.#parent;
  }

  /**
   * Walk up the ancestor chain and return the nearest widget matching the predicate.
   * Checks self first, then parent, then grandparent, etc.
   */
  closest(predicate: (widget: TuiWidgetEntity) => boolean): TuiWidgetEntity | undefined {
    if (predicate(this)) {
      return this;
    }

    return this.#parent?.closest(predicate);
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
    child.#parent = this;
    child.mounted();
  }

  removeChild(child: TuiWidgetEntity): void {
    const index = this.#children.indexOf(child);
    if (index !== -1) {
      this.#children.splice(index, 1);
      child.#parent = null;
      child.unmounted();
    }
  }

  updateRect(_rect: Partial<TuiWidgetRect>): void {
    // Default no-op — subclasses override with actual implementation
    void _rect;
  }

  containsPoint(x: number, y: number): boolean {
    const {x: rx, y: ry, width: rw, height: rh} = this.rect;
    return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
  }

  on<E extends keyof TuiWidgetEventData>(event: E, handler: (data: TuiWidgetEventData[E]) => void): void;
  on(event: string, handler: WidgetEventHandler): void;
  on(event: string, handler: WidgetEventHandler): void {
    let handlers = this.#eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.#eventHandlers.set(event, handlers);
    }

    handlers.add(handler);
  }

  off<E extends keyof TuiWidgetEventData>(event: E, handler: (data: TuiWidgetEventData[E]) => void): void;
  off(event: string, handler: WidgetEventHandler): void;
  off(event: string, handler: WidgetEventHandler): void {
    this.#eventHandlers.get(event)?.delete(handler);
  }

  dispatch<E extends keyof TuiWidgetEventData>(eventType: E, data: TuiWidgetEventData[E]): void;
  dispatch(eventType: string, data: unknown): void;
  dispatch(eventType: string, data: unknown): void {
    this.#propagationStopped = false;
    this.#dispatchInternal(eventType, data, false);
  }

  stopPropagation(): void {
    this.#propagationStopped = true;
  }

  dispatchKeyEvent(event: KeyboardEvent): void {
    this.dispatch('key', event as unknown);
  }

  mounted() {
    this.#referenceCount++;
  }

  unmounted(): void {
    this.#referenceCount--;
    if (this.#referenceCount <= 0) {
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

  update(_dt: number): void {
    void _dt;
  }

  abstract emitDrawCommands(buf: DrawListBuffer): void;

  protected initRect(
    x?: TuiSizeValue,
    y?: TuiSizeValue,
    width?: TuiSizeValue,
    height?: TuiSizeValue,
    defaults?: Partial<TuiWidgetRect>,
  ): TuiWidgetRect {
    const spec = extractPercentSpec(x, y, width, height);
    if (spec) {
      this.setPercentSpec(spec);
    }

    return {
      x: isPercent(x) ? 0 : (x ?? defaults?.x ?? 0),
      y: isPercent(y) ? 0 : (y ?? defaults?.y ?? 0),
      width: isPercent(width) ? 0 : (width ?? defaults?.width ?? 0),
      height: isPercent(height) ? 0 : (height ?? defaults?.height ?? 0),
    };
  }

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

  #resolvePercent(value: `${number}%`, total: number): number {
    const pct = Number.parseFloat(value);
    return Math.max(0, Math.floor(pct / 100 * total));
  }

  #dispatchInternal(eventType: string, data: unknown, stopped: boolean): void {
    if (stopped) {
      return;
    }

    const handlers = this.#eventHandlers.get(eventType);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }

    if (this.#parent) {
      this.#parent.#dispatchInternal(eventType, data, this.#propagationStopped);
    }
  }
}
