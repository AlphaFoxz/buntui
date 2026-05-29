import type {DrawListBuffer} from '../draw_list/DrawListBuffer';
import {TUI_CONTEXT_INSTANCE} from '../extern/app/TuiContext';
import type {TuiWidgetEntity} from '../widgets/TuiWidgetEntity';
import type {Focusable} from '../widgets/Focusable';
import type {FocusManager} from '../app/FocusManager';
import {resolvePosition, type PositionStrategy} from './PositionStrategy';
import type {OverlayHandle, OverlayOptions} from './types';

const DEFAULT_BASE_Z_INDEX = 100;
const DEFAULT_BACKDROP_RGBA = 0x00_00_00_AA;

type OverlayEntry = {
  widget: TuiWidgetEntity;
  handle: OverlayHandleImpl;
  options: OverlayOptions;
  zIndex: number;
  previousZIndex: number;
  previousPortal: boolean;
  savedFocus: (TuiWidgetEntity & Focusable) | undefined;
};

export class OverlayManager {
  readonly #baseZIndex: number;
  readonly #backdropRgba: number;
  readonly #stack: OverlayEntry[] = [];
  #focusManager: FocusManager | undefined;
  #nextZIndex: number;

  constructor(options?: {baseZIndex?: number; backdropRgba?: number}) {
    this.#baseZIndex = options?.baseZIndex ?? DEFAULT_BASE_Z_INDEX;
    this.#backdropRgba = options?.backdropRgba ?? DEFAULT_BACKDROP_RGBA;
    this.#nextZIndex = this.#baseZIndex;
  }

  setFocusManager(fm: FocusManager): void {
    this.#focusManager = fm;
  }

  open(widget: TuiWidgetEntity, options?: OverlayOptions): OverlayHandle {
    const entry: OverlayEntry = {
      widget,
      handle: undefined as unknown as OverlayHandleImpl,
      options: options ?? {},
      zIndex: this.#nextZIndex++,
      previousZIndex: widget.zIndex,
      previousPortal: widget.portal,
      savedFocus: undefined,
    };

    const handle = new OverlayHandleImpl(widget, () => {
      this.#closeEntry(entry);
    });
    entry.handle = handle;

    widget.setPortal(true);
    widget.setZIndex(entry.zIndex);

    if (entry.options.positionStrategy) {
      this.#applyPosition(widget, entry.options.positionStrategy);
    }

    if (entry.options.trapFocus && this.#focusManager) {
      entry.savedFocus = this.#focusManager.focusedWidget;
      this.#focusManager.pushFocusScope(widget);
    }

    this.#stack.push(entry);
    return handle;
  }

  close(handle: OverlayHandle): void {
    const index = this.#stack.findIndex(entry => entry.handle === handle);
    if (index !== -1) {
      this.#closeEntry(this.#stack[index]!);
    }
  }

  closeAll(): void {
    while (this.#stack.length > 0) {
      this.#closeEntry(this.#stack.at(-1)!);
    }
  }

  getTopOverlay(): TuiWidgetEntity | undefined {
    return this.#stack.at(-1)?.widget;
  }

  getBackdropEntries(): Array<{zIndex: number; draw: (buf: DrawListBuffer) => void}> {
    const result: Array<{zIndex: number; draw: (buf: DrawListBuffer) => void}> = [];
    for (const entry of this.#stack) {
      if (entry.options.backdrop && entry.widget.visible) {
        const bgRgba = entry.options.backdropRgba ?? this.#backdropRgba;
        result.push({
          zIndex: entry.zIndex,
          draw(buf: DrawListBuffer) {
            const termCols = TUI_CONTEXT_INSTANCE.cols;
            const termRows = TUI_CONTEXT_INSTANCE.rows;
            buf.drawRect({
              x: 0, y: 0, width: termCols, height: termRows, bgRgba,
            });
          },
        });
      }
    }

    return result;
  }

  #closeEntry(entry: OverlayEntry): void {
    const index = this.#stack.indexOf(entry);
    if (index === -1) {
      return;
    }

    this.#stack.splice(index, 1);

    entry.widget.setPortal(entry.previousPortal);
    entry.widget.setZIndex(entry.previousZIndex);

    if (entry.options.trapFocus && this.#focusManager) {
      this.#focusManager.popFocusScope();
      if (entry.savedFocus?.acceptsFocus) {
        this.#focusManager.focusWidget(entry.savedFocus);
      }
    }

    fireHandleClosed(entry.handle);
  }

  #applyPosition(widget: TuiWidgetEntity, strategy: PositionStrategy): void {
    const termCols = TUI_CONTEXT_INSTANCE.cols;
    const termRows = TUI_CONTEXT_INSTANCE.rows;
    const {width, height} = widget.rect;
    const {x, y} = resolvePosition(strategy, {width, height}, termCols, termRows);
    widget.updateRect({x, y});
  }
}

class OverlayHandleImpl implements OverlayHandle {
  readonly #widget: TuiWidgetEntity;
  readonly #closeFn: () => void;
  readonly #closedCallbacks: Array<() => void> = [];
  #closed = false;

  constructor(widget: TuiWidgetEntity, closeFn: () => void) {
    this.#widget = widget;
    this.#closeFn = closeFn;
  }

  get widget(): TuiWidgetEntity {
    return this.#widget;
  }

  get closed(): boolean {
    return this.#closed;
  }

  close(): void {
    if (!this.#closed) {
      this.#closeFn();
    }
  }

  onClosed(callback: () => void): void {
    if (this.#closed) {
      callback();
      return;
    }

    this.#closedCallbacks.push(callback);
  }

  fireClosed(): void {
    this.#closed = true;
    for (const cb of this.#closedCallbacks) {
      cb();
    }

    this.#closedCallbacks.length = 0;
  }
}

function fireHandleClosed(handle: OverlayHandleImpl): void {
  handle.fireClosed();
}
