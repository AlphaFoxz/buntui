import {genId} from '../../utils/genId';
import {rgbToRgba} from '../../utils/styles';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {MouseEvent} from '../../events/types';
import {type TuiWidgetEntity} from '../../widgets/TuiWidgetEntity';
import {getTheme} from '../../theme/provider';
import {type TuiSceneOptions} from './types';
import {TUI_CONTEXT_INSTANCE} from './TuiContext';

export class TuiScene {
  readonly #id: bigint;
  #visible: boolean;
  #bgRgba: number;
  readonly #widgets = new Set<TuiWidgetEntity>();
  readonly #lifecycleHandlers = new Map<string, Array<() => void>>();
  #sortedCache: TuiWidgetEntity[] | undefined = undefined;

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
    const mx = rawEvent.x - 1;
    const my = rawEvent.y - 1;

    const sorted = [...this.#widgets].toReversed().toSorted((a, b) => b.zIndex - a.zIndex);
    for (const widget of sorted) {
      if (widget.visible && widget.containsPoint(mx, my)) {
        return widget;
      }
    }

    return undefined;
  }

  clearWidgets() {
    for (const widget of this.#widgets) {
      widget.unmounted();
    }

    this.#widgets.clear();
    this.#invalidateCache();
  }

  destroy() {
    for (const widget of this.#widgets) {
      this.unmount(widget);
    }

    this.#lifecycleHandlers.clear();
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
  }

  #getSortedWidgets(): TuiWidgetEntity[] {
    this.#sortedCache ??= [...this.#widgets].toSorted((a, b) => a.zIndex - b.zIndex);
    return this.#sortedCache;
  }
}

export default TuiScene;
