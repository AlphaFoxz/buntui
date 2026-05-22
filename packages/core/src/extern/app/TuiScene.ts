import {genId} from '../../utils/genId';
import {rgbToRgba} from '../../utils/styles';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {MouseEvent} from '../../events/types';
import {isFocusable, type Focusable} from '../../widgets/Focusable';
import {type TuiWidgetEntity} from '../../widgets/TuiWidgetEntity';
import {getTheme} from '../../theme/provider';
import type {Entity} from '../types';
import {type TuiSceneOptions} from './types';
import {TUI_CONTEXT_INSTANCE} from './TuiContext';

export class TuiScene implements Entity {
  readonly #id: bigint;
  #visible: boolean;
  #bgRgba: number;
  readonly #widgets = new Set<TuiWidgetEntity>();
  readonly #lifecycleHandlers = new Map<string, Array<() => void>>();
  readonly #tickHandlers: Array<(dt: number) => void> = [];
  #sortedCache: TuiWidgetEntity[] | undefined = undefined;
  #sortedReverseCache: TuiWidgetEntity[] | undefined = undefined;

  constructor(options?: Partial<TuiSceneOptions>) {
    this.#id = genId();
    this.#visible = options?.visible ?? false;
    this.#bgRgba = rgbToRgba(options?.bgHexRgb ?? getTheme().colors.background);
  }

  // --- Getters / Setters ---

  get id() {
    return this.#id;
  }

  get bgHexRgb() {
    return this.#bgRgba >> 8;
  }

  get visible() {
    return this.#visible;
  }

  // --- Public API ---

  mount(widget: TuiWidgetEntity) {
    this.#widgets.add(widget);
    this.#invalidateCache();
    widget.mounted();
    return this;
  }

  unmount(widget: TuiWidgetEntity) {
    this.#widgets.delete(widget);
    this.#invalidateCache();
    widget.unmounted();
    return this;
  }

  setBgRgb(hexRgb: number | string): void;
  setBgRgb(r: number, g: number, b: number): void;
  setBgRgb(rgbColor: {r: number; g: number; b: number}): void;
  setBgRgb(
    color: {r: number; g: number; b: number} | string | number,
    g?: number,
    b?: number,
  ): void {
    this.#bgRgba = typeof color === 'number' && g !== undefined && b !== undefined
      ? rgbToRgba(color, g, b)
      : rgbToRgba(color);
  }

  setVisible(visible: boolean) {
    this.#visible = visible;
  }

  update(dt: number): void {
    for (const handler of this.#tickHandlers) {
      handler(dt);
    }

    for (const widget of this.#widgets) {
      if (widget.visible) {
        widget.update(dt);
      }
    }
  }

  emitDrawCommands(buf: DrawListBuffer): void {
    const termCols = TUI_CONTEXT_INSTANCE.cols;
    const termRows = TUI_CONTEXT_INSTANCE.rows;
    for (const widget of this.#widgets) {
      if (widget.hasPercentLayout) {
        widget.resolveLayout(termCols, termRows);
      }
    }

    buf.setBackground(this.#bgRgba);
    buf.setSynchronizedUpdate(true);
    buf.hideCursor();

    for (const widget of this.#getSortedWidgets()) {
      if (widget.visible) {
        widget.emitDrawCommands(buf);
      }
    }
  }

  hitTest(rawEvent: MouseEvent): TuiWidgetEntity | undefined {
    const mx = rawEvent.x;
    const my = rawEvent.y;

    for (const widget of this.#getSortedWidgetsReverse()) {
      if (widget.visible && widget.containsPoint(mx, my)) {
        return this.#deepHitTest(widget, mx, my);
      }
    }

    return undefined;
  }

  getFocusableWidgets(): ReadonlyArray<TuiWidgetEntity & Focusable> {
    return this.#buildFocusableList();
  }

  clearWidgets() {
    for (const widget of this.#widgets) {
      widget.unmounted();
    }

    this.#widgets.clear();
    this.#tickHandlers.length = 0;
    this.#invalidateCache();
  }

  destroy() {
    for (const widget of this.#widgets) {
      this.unmount(widget);
    }

    this.#lifecycleHandlers.clear();
    this.#tickHandlers.length = 0;
  }

  onTick(handler: (dt: number) => void): () => void {
    this.#tickHandlers.push(handler);
    let removed = false;
    return () => {
      if (removed) {
        return;
      }

      removed = true;
      const index = this.#tickHandlers.indexOf(handler);
      if (index !== -1) {
        this.#tickHandlers.splice(index, 1);
      }
    };
  }

  offTick(handler: (dt: number) => void): void {
    const index = this.#tickHandlers.indexOf(handler);
    if (index !== -1) {
      this.#tickHandlers.splice(index, 1);
    }
  }

  on(event: 'enter' | 'exit', handler: () => void): void {
    const list = this.#lifecycleHandlers.get(event) ?? [];
    list.push(handler);
    this.#lifecycleHandlers.set(event, list);
  }

  off(event: 'enter' | 'exit', handler: () => void): void {
    const list = this.#lifecycleHandlers.get(event);
    if (!list) {
      return;
    }

    const index = list.indexOf(handler);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  emitLifecycle(event: 'enter' | 'exit'): void {
    const handlers = this.#lifecycleHandlers.get(event);
    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler();
    }
  }

  // --- Private ---

  #invalidateCache(): void {
    this.#sortedCache = undefined;
    this.#sortedReverseCache = undefined;
  }

  #getSortedWidgets(): TuiWidgetEntity[] {
    this.#sortedCache ??= [...this.#widgets].toSorted((a, b) => a.zIndex - b.zIndex);
    return this.#sortedCache;
  }

  #getSortedWidgetsReverse(): TuiWidgetEntity[] {
    this.#sortedReverseCache ??= [...this.#widgets].toReversed().toSorted((a, b) => b.zIndex - a.zIndex);
    return this.#sortedReverseCache;
  }

  #deepHitTest(widget: TuiWidgetEntity, x: number, y: number): TuiWidgetEntity {
    const {children} = widget;
    if (children.length > 0) {
      const sorted = children.toSorted((a, b) => b.zIndex - a.zIndex);
      for (const child of sorted) {
        if (child.visible && child.containsPoint(x, y)) {
          return this.#deepHitTest(child, x, y);
        }
      }
    }

    return widget;
  }

  #buildFocusableList(): Array<TuiWidgetEntity & Focusable> {
    const result: Array<TuiWidgetEntity & Focusable> = [];
    for (const widget of this.#widgets) {
      this.#collectFocusable(widget, result);
    }

    return result.toSorted((a, b) => {
      const aIndex = a.tabIndex;
      const bIndex = b.tabIndex;
      if (aIndex !== undefined && bIndex !== undefined) {
        return aIndex - bIndex;
      }

      if (aIndex !== undefined) {
        return -1;
      }

      if (bIndex !== undefined) {
        return 1;
      }

      return 0;
    });
  }

  #collectFocusable(widget: TuiWidgetEntity, out: Array<TuiWidgetEntity & Focusable>): void {
    if (!widget.visible) {
      return;
    }

    if (isFocusable(widget) && widget.acceptsFocus) {
      out.push(widget);
    }

    for (const child of widget.children) {
      this.#collectFocusable(child, out);
    }
  }
}

export default TuiScene;
