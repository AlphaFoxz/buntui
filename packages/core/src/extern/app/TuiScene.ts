import {genId} from '../../utils/genId';
import {parseColor, type TuiColor} from '../../utils/color';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {MouseEvent} from '../../events/types';
import {isFocusable, type Focusable} from '../../widgets/Focusable';
import {type TuiWidgetEntity} from '../../widgets/TuiWidgetEntity';
import {getTheme, onThemeChange} from '../../theme/provider';
import type {Entity} from '../types';
import {OverlayManager} from '../../overlay/OverlayManager';
import {type TuiSceneOptions} from './types';
import {TUI_CONTEXT_INSTANCE} from './TuiContext';

export class TuiScene implements Entity {
  readonly #id: bigint;
  #visible: boolean;
  #bgRgba: number;
  #themeUnsub: (() => void) | undefined;
  readonly #widgets = new Set<TuiWidgetEntity>();
  readonly #lifecycleHandlers = new Map<string, Array<() => void>>();
  readonly #tickHandlers: Array<(dt: number) => void> = [];
  #sortedAllReverseCache: TuiWidgetEntity[] | undefined = undefined;
  readonly #overlayManager = new OverlayManager();

  constructor(options?: Partial<TuiSceneOptions>) {
    this.#id = genId();
    this.#visible = options?.visible ?? false;
    this.#bgRgba = this.#resolveBgColor(options?.bgHexRgb ?? getTheme().colors.background);
    if (options?.bgHexRgb === undefined) {
      this.#themeUnsub = onThemeChange(theme => {
        this.#bgRgba = parseColor(theme.colors.background);
      });
    }
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

  getOverlayManager(): OverlayManager {
    return this.#overlayManager;
  }

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
    this.#bgRgba = typeof color === 'number' && g !== undefined && b !== undefined ? parseColor(`rgb(${color},${g},${b})`) : this.#resolveBgColor(color);
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

    const portalWidgets = this.#collectPortalWidgets();
    const backdropEntries = this.#overlayManager.getBackdropEntries();

    type RenderItem
      = | {kind: 'widget'; zIndex: number; widget: TuiWidgetEntity}
        | {kind: 'backdrop'; zIndex: number; draw: (buf: DrawListBuffer) => void};

    const items: RenderItem[] = [];
    for (const w of this.#widgets) {
      items.push({kind: 'widget', zIndex: w.zIndex, widget: w});
    }

    for (const pw of portalWidgets) {
      items.push({kind: 'widget', zIndex: pw.zIndex, widget: pw});
    }

    for (const bd of backdropEntries) {
      items.push({kind: 'backdrop', zIndex: bd.zIndex, draw: bd.draw});
    }

    items.sort((a, b) => a.zIndex - b.zIndex);
    for (const item of items) {
      if (item.kind === 'widget') {
        if (item.widget.visible) {
          item.widget.emitDrawCommands(buf);
        }
      } else {
        item.draw(buf);
      }
    }
  }

  hitTest(rawEvent: MouseEvent): TuiWidgetEntity | undefined {
    const mx = rawEvent.x;
    const my = rawEvent.y;

    for (const widget of this.#getSortedAllWidgetsReverse()) {
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
    this.#themeUnsub?.();
    this.#themeUnsub = undefined;
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
    this.#sortedAllReverseCache = undefined;
  }

  #getSortedAllWidgetsReverse(): TuiWidgetEntity[] {
    const all = [...this.#widgets, ...this.#collectPortalWidgets()];
    this.#sortedAllReverseCache = all.toReversed().toSorted((a, b) => b.zIndex - a.zIndex);
    return this.#sortedAllReverseCache;
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

  #resolveBgColor(color: TuiColor | {r: number; g: number; b: number}): number {
    if (typeof color === 'object' && 'r' in color && 'g' in color && 'b' in color) {
      return parseColor(`rgb(${color.r},${color.g},${color.b})`);
    }

    return parseColor(color);
  }

  #collectPortalWidgets(): TuiWidgetEntity[] {
    const result: TuiWidgetEntity[] = [];
    for (const widget of this.#widgets) {
      if (!widget.visible) {
        continue;
      }

      this.#collectPortalWidgetsRecursive(widget, result);
    }

    return result;
  }

  #collectPortalWidgetsRecursive(widget: TuiWidgetEntity, out: TuiWidgetEntity[]): void {
    for (const child of widget.children) {
      if (!child.visible) {
        continue;
      }

      if (child.portal) {
        out.push(child);
      }

      this.#collectPortalWidgetsRecursive(child, out);
    }
  }
}

export default TuiScene;
