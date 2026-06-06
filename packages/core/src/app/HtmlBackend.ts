import type {DrawListBuffer} from '../draw_list/DrawListBuffer';
import type {TuiContextLike} from '../extern/app/TuiContext';
import type {LogLevel} from '../extern/app/types';
import {
  TuiEventType,
  KeyboardEvent as TuiKeyboardEvent,
  MouseEvent as TuiMouseEvent,
  TermResizeEvent as TuiTermResizeEvent,
  WheelEvent as TuiWheelEvent,
} from '../events/types';
import TuiDataViewWrapper from '../extern/TuiDataViewWrapper';
import type {WasmModule} from './wasm-module';
import type {TuiBackend, TuiBackendEventHandler} from './TuiBackend';

type DomKeyboardEvent = {
  readonly key?: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly keyCode: number;
};

type TerminalKeyEvent = {key: string; domEvent?: DomKeyboardEvent};

export type TerminalMouseEvent = {col: number; row: number; button: number; buttons: number; action: string};

type TerminalResizeEvent = {cols: number; rows: number};

type DomTouch = {
  readonly clientX: number;
  readonly clientY: number;
};

type DomTouchEvent = {
  readonly touches: readonly DomTouch[];
  readonly changedTouches: readonly DomTouch[];
  preventDefault(): void;
};

type DomRect = {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly top: number;
};

type DomElement = {
  readonly style: Record<string, string>;
  querySelector(selector: string): DomElement | null;
  getBoundingClientRect(): DomRect;
  addEventListener(type: string, listener: (event: DomTouchEvent) => void, options?: {passive?: boolean}): void;
  removeEventListener(type: string, listener: (event: DomTouchEvent) => void): void;
};

export type TerminalLike = {
  rows: number;
  cols: number;
  element?: unknown;
  write(data: string): void;
  focus?(): void;
  onData?(handler: (data: string) => void): {dispose(): void};
  onKey(handler: (event: TerminalKeyEvent) => void): {dispose(): void};
  onMouse?(handler: (event: TerminalMouseEvent) => void): {dispose(): void};
  onResize(handler: (event: TerminalResizeEvent) => void): {dispose(): void};
};

export type HtmlBackendOptions = {
  terminal: TerminalLike;
  wasmModule: WasmModule;
  isTextInputFocused?: () => boolean;
};

const MOD_SHIFT = 0x01;
const MOD_CTRL = 0x02;
const MOD_ALT = 0x04;
const MOD_META = 0x08;
const MOD_REPEAT = 0x10;

const HAS_BUTTON = 0x01;
const HAS_BUTTONS = 0x02;
const IS_RELEASE = 0x10;

export class HtmlBackend implements TuiBackend {
  readonly #terminal: TerminalLike;
  readonly #wasm: WasmModule;
  readonly #isTextInputFocused?: () => boolean;
  #ctxPtr = 0;
  #eventDisposables: Array<{dispose(): void}> = [];
  #mouseButtons = 0;

  constructor(options: HtmlBackendOptions) {
    this.#terminal = options.terminal;
    this.#wasm = options.wasmModule;
    this.#isTextInputFocused = options.isTextInputFocused;
  }

  setupLogger(_logFileDir: string, _logName: string, _logLevel: LogLevel, _clearLog: boolean): void {
    // No-op: browser uses console directly
  }

  startApp(): void {
    this.#ctxPtr = this.#wasm.exports.createTuiContext();
  }

  stopApp(): void {
    if (this.#ctxPtr) {
      this.#wasm.exports.destroyTuiContext(this.#ctxPtr);
      this.#ctxPtr = 0;
    }

    this.stopEvents();
  }

  detectTermSize(context: TuiContextLike): void {
    context.rows = this.#terminal.rows;
    context.cols = this.#terminal.cols;
    if (this.#ctxPtr) {
      this.#wasm.exports.setTerminalSize(this.#ctxPtr, this.#terminal.rows, this.#terminal.cols);
    }
  }

  renderDrawList(context: TuiContextLike, drawListBuffer: DrawListBuffer): void {
    const wasm = this.#wasm;
    const {byteLength} = drawListBuffer;

    this.#syncContext(context);

    const bufPtr = wasm.alloc(byteLength);
    try {
      wasm.copyToWasm(drawListBuffer.buffer.slice(0, byteLength), bufPtr);
      wasm.exports.renderDrawListToBuffer(this.#ctxPtr, bufPtr, byteLength);

      const outputPtr = wasm.exports.getOutputPtr();
      const outputLength = wasm.exports.getOutputLen();
      if (outputLength > 0) {
        const ansiOutput = wasm.readString(outputPtr, outputLength);
        this.#terminal.write(ansiOutput);
      }
    } finally {
      wasm.dealloc(bufPtr, byteLength);
    }
  }

  startEvents(handler: TuiBackendEventHandler): void {
    this.stopEvents();

    const keyDisposable = this.#terminal.onKey((keyEvent: TerminalKeyEvent) => {
      const key = keyEvent.domEvent?.key ?? keyEvent.key;
      const event = new TuiKeyboardEvent(serializeKeyboardEvent(key, keyEvent.domEvent));
      handler(TuiEventType.KeyboardEvent, event);
    });

    const mouseDisposable = this.#terminal.onMouse?.((mouseEvent: TerminalMouseEvent) => {
      const event = new TuiMouseEvent(serializeMouseEvent(mouseEvent));
      handler(TuiEventType.MouseEvent, event);
    });

    const dataDisposable = this.#startMouseTracking(handler);
    const touchDisposable = this.#startTouchTracking(handler);

    const resizeDisposable = this.#terminal.onResize((resizeEvent: TerminalResizeEvent) => {
      const event = new TuiTermResizeEvent(serializeResizeEvent(resizeEvent.rows, resizeEvent.cols));
      handler(TuiEventType.TermResizeEvent, event);
    });

    this.#eventDisposables = [keyDisposable, mouseDisposable, dataDisposable, touchDisposable, resizeDisposable].filter((d): d is {dispose(): void} => d !== undefined);
  }

  stopEvents(): void {
    this.#terminal.write('\u001B[?1003l\u001B[?1006l');
    for (const disposable of this.#eventDisposables) {
      disposable.dispose();
    }

    this.#eventDisposables = [];
  }

  #syncContext(context: TuiContextLike): void {
    if (!this.#ctxPtr) {
      return;
    }

    this.#wasm.exports.updateTuiContext(
      this.#ctxPtr,
      context.tick,
      context.x,
      context.y,
      context.rows,
      context.cols,
      context.resizeBehavior,
      context.debugMode ? 1 : 0,
    );
  }

  #startMouseTracking(handler: TuiBackendEventHandler): {dispose(): void} | undefined {
    if (this.#terminal.onMouse || !this.#terminal.onData) {
      return undefined;
    }

    this.#terminal.write('\u001B[?1003h\u001B[?1006h');

    const sgrRegex = /\u001B\[<(\d+);(\d+);(\d+)([Mm])/g;

    return this.#terminal.onData((data: string) => {
      sgrRegex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = sgrRegex.exec(data)) !== null) {
        const cb = Number(match[1]!);
        const col = Number(match[2]!) - 1;
        const row = Number(match[3]!) - 1;
        const isRelease = match[4] === 'm';

        const button = cb & 3;
        const isMotion = (cb & 32) !== 0;
        const isWheel = cb >= 64;

        if (isWheel) {
          const event = new TuiWheelEvent(serializeWheelEvent(row, col, cb === 65 ? 1 : -1));
          handler(TuiEventType.WheelEvent, event);
          continue;
        }

        if (isRelease) {
          this.#mouseButtons &= ~(1 << button);
          const event = new TuiMouseEvent(serializeMouseEvent({
            col,
            row,
            button,
            buttons: this.#mouseButtons,
            action: 'mouseup',
          }));
          handler(TuiEventType.MouseEvent, event);
          continue;
        }

        if (isMotion) {
          const event = new TuiMouseEvent(serializeMouseEvent({
            col,
            row,
            button: undefined as unknown as number,
            buttons: this.#mouseButtons,
            action: 'mousemove',
          }));
          handler(TuiEventType.MouseEvent, event);
          continue;
        }

        this.#mouseButtons |= 1 << button;
        const event = new TuiMouseEvent(serializeMouseEvent({
          col,
          row,
          button,
          buttons: undefined as unknown as number,
          action: 'mousedown',
        }));
        handler(TuiEventType.MouseEvent, event);
      }
    });
  }

  #startTouchTracking(handler: TuiBackendEventHandler): {dispose(): void} | undefined {
    /* eslint-disable unicorn/prevent-abbreviations */
    const element = this.#terminal.element as DomElement | null | undefined;
    if (!element) {
      return undefined;
    }

    element.style.touchAction = 'none';
    const viewport = element.querySelector('.xterm-viewport');
    if (viewport) {
      viewport.style.overflow = 'hidden';
    }

    let startTouchX = 0;
    let startTouchY = 0;
    let startCol = 0;
    let startRow = 0;
    let isScrolling = false;
    let touchActive = false;
    let dragEmitted = false;

    const SCROLL_THRESHOLD = 10;

    const getScreenRect = (): DomRect => {
      const screenElement = element.querySelector('.xterm-screen');
      return (screenElement ?? element).getBoundingClientRect();
    };

    const touchToCell = (clientX: number, clientY: number): {col: number; row: number} => {
      const rect = getScreenRect();
      const cellWidth = rect.width / this.#terminal.cols;
      const cellHeight = rect.height / this.#terminal.rows;
      return {
        col: Math.max(0, Math.min(this.#terminal.cols - 1, Math.floor((clientX - rect.left) / cellWidth))),
        row: Math.max(0, Math.min(this.#terminal.rows - 1, Math.floor((clientY - rect.top) / cellHeight))),
      };
    };

    const onTouchStart = (e: DomTouchEvent) => {
      if (e.touches.length !== 1) {
        return;
      }

      e.preventDefault();
      const touch = e.touches[0]!;
      startTouchX = touch.clientX;
      startTouchY = touch.clientY;
      const cell = touchToCell(touch.clientX, touch.clientY);
      startCol = cell.col;
      startRow = cell.row;
      isScrolling = false;
      touchActive = true;
      dragEmitted = false;
    };

    const onTouchMove = (e: DomTouchEvent) => {
      if (!touchActive || e.touches.length !== 1) {
        return;
      }

      e.preventDefault();
      const touch = e.touches[0]!;

      if (!isScrolling) {
        const dx = touch.clientX - startTouchX;
        const dy = touch.clientY - startTouchY;
        if (((dx * dx) + (dy * dy)) < (SCROLL_THRESHOLD * SCROLL_THRESHOLD)) {
          return;
        }

        isScrolling = true;
      }

      if (!dragEmitted) {
        dragEmitted = true;
        handler(TuiEventType.MouseEvent, new TuiMouseEvent(serializeMouseEvent({
          col: startCol,
          row: startRow,
          button: 0,
          buttons: 1,
          action: 'mousedown',
        })));
      }

      const {col, row} = touchToCell(touch.clientX, touch.clientY);
      handler(TuiEventType.MouseEvent, new TuiMouseEvent(serializeMouseEvent({
        col,
        row,
        button: undefined as unknown as number,
        buttons: 1,
        action: 'mousemove',
      })));
    };

    const onTouchEnd = (e: DomTouchEvent) => {
      if (!touchActive) {
        return;
      }

      e.preventDefault();
      touchActive = false;

      if (!isScrolling) {
        const touch = e.changedTouches[0]!;
        const {col, row} = touchToCell(touch.clientX, touch.clientY);
        handler(TuiEventType.MouseEvent, new TuiMouseEvent(serializeMouseEvent({
          col,
          row,
          button: 0,
          buttons: 1,
          action: 'mousedown',
        })));
        handler(TuiEventType.MouseEvent, new TuiMouseEvent(serializeMouseEvent({
          col,
          row,
          button: 0,
          buttons: 0,
          action: 'mouseup',
        })));
        if (this.#isTextInputFocused?.()) {
          this.#terminal.focus?.();
        }
      } else if (dragEmitted) {
        const touch = e.changedTouches[0]!;
        const {col, row} = touchToCell(touch.clientX, touch.clientY);
        handler(TuiEventType.MouseEvent, new TuiMouseEvent(serializeMouseEvent({
          col,
          row,
          button: 0,
          buttons: 0,
          action: 'mouseup',
        })));
      }

      isScrolling = false;
    };

    element.addEventListener('touchstart', onTouchStart, {passive: false});
    element.addEventListener('touchmove', onTouchMove, {passive: false});
    element.addEventListener('touchend', onTouchEnd, {passive: false});
    element.addEventListener('touchcancel', onTouchEnd, {passive: false});

    return {
      dispose() {
        element.removeEventListener('touchstart', onTouchStart);
        element.removeEventListener('touchmove', onTouchMove);
        element.removeEventListener('touchend', onTouchEnd);
        element.removeEventListener('touchcancel', onTouchEnd);
      },
    };
    /* eslint-enable unicorn/prevent-abbreviations */
  }
}

export function serializeKeyboardEvent(key: string, domEvent?: DomKeyboardEvent): ArrayBuffer {
  const encoded = new TextEncoder().encode(key);
  const buf = new ArrayBuffer(4 + encoded.byteLength);
  const view = new TuiDataViewWrapper(buf);
  let modifiers = 0;
  if (domEvent) {
    if (domEvent.shiftKey) {
      modifiers |= MOD_SHIFT;
    }

    if (domEvent.ctrlKey) {
      modifiers |= MOD_CTRL;
    }

    if (domEvent.altKey) {
      modifiers |= MOD_ALT;
    }

    if (domEvent.metaKey) {
      modifiers |= MOD_META;
    }

    if (domEvent.repeat) {
      modifiers |= MOD_REPEAT;
    }
  }

  view.setUint8(0, modifiers);
  view.setUint16(1, domEvent?.keyCode ?? (key.codePointAt(0) ?? 0), true);
  view.setUint8(3, encoded.byteLength);
  new Uint8Array(buf).set(encoded, 4);
  return buf;
}

export function serializeMouseEvent(event: TerminalMouseEvent): ArrayBuffer {
  const buf = new ArrayBuffer(8);
  const view = new TuiDataViewWrapper(buf);

  let flags = 0;
  if (event.action === 'mouseup') {
    flags |= IS_RELEASE;
  }

  if (event.button !== undefined) {
    flags |= HAS_BUTTON;
  }

  if (event.buttons !== undefined) {
    flags |= HAS_BUTTONS;
  }

  view.setUint8(0, 0);
  view.setUint8(1, flags);
  view.setUint8(2, event.button ?? 0);
  view.setUint8(3, event.buttons ?? 0);
  view.setUint16(4, event.col + 1, true);
  view.setUint16(6, event.row + 1, true);
  return buf;
}

export function serializeResizeEvent(rows: number, cols: number): ArrayBuffer {
  const buf = new ArrayBuffer(4);
  const view = new TuiDataViewWrapper(buf);
  view.setUint16(0, rows, true);
  view.setUint16(2, cols, true);
  return buf;
}

export function serializeWheelEvent(row: number, col: number, deltaY: number): ArrayBuffer {
  const buf = new ArrayBuffer(9);
  const view = new TuiDataViewWrapper(buf);
  view.setUint8(0, 0);
  view.setUint8(1, HAS_BUTTON);
  view.setUint8(2, 0);
  view.setUint8(3, 0);
  view.setUint16(4, col + 1, true);
  view.setUint16(6, row + 1, true);
  view.setInt8(8, deltaY);
  return buf;
}
