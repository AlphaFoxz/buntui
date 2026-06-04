import type {DrawListBuffer} from '../draw_list/DrawListBuffer';
import type {TuiContextLike} from '../extern/app/TuiContext';
import type {LogLevel} from '../extern/app/types';
import {
  TuiEventType,
  KeyboardEvent as TuiKeyboardEvent,
  MouseEvent as TuiMouseEvent,
  TermResizeEvent as TuiTermResizeEvent,
} from '../events/types';
import TuiDataViewWrapper from '../extern/TuiDataViewWrapper';
import type {WasmModule} from './wasm-module';
import type {TuiBackend, TuiBackendEventHandler} from './TuiBackend';

type DomKeyboardEvent = {
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

type TerminalLike = {
  rows: number;
  cols: number;
  write(data: string): void;
  onKey(handler: (event: TerminalKeyEvent) => void): {dispose(): void};
  onMouse(handler: (event: TerminalMouseEvent) => void): {dispose(): void};
  onResize(handler: (event: TerminalResizeEvent) => void): {dispose(): void};
};

export type HtmlBackendOptions = {
  terminal: TerminalLike;
  wasmModule: WasmModule;
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
  #ctxPtr = 0;
  #eventDisposables: Array<{dispose(): void}> = [];

  constructor(options: HtmlBackendOptions) {
    this.#terminal = options.terminal;
    this.#wasm = options.wasmModule;
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
      const event = new TuiKeyboardEvent(serializeKeyboardEvent(keyEvent.key, keyEvent.domEvent));
      handler(TuiEventType.KeyboardEvent, event);
    });

    const mouseDisposable = this.#terminal.onMouse((mouseEvent: TerminalMouseEvent) => {
      const event = new TuiMouseEvent(serializeMouseEvent(mouseEvent));
      handler(TuiEventType.MouseEvent, event);
    });

    const resizeDisposable = this.#terminal.onResize((resizeEvent: TerminalResizeEvent) => {
      const event = new TuiTermResizeEvent(serializeResizeEvent(resizeEvent.rows, resizeEvent.cols));
      handler(TuiEventType.TermResizeEvent, event);
    });

    this.#eventDisposables = [keyDisposable, mouseDisposable, resizeDisposable];
  }

  stopEvents(): void {
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
      Number(context.tick),
      context.x,
      context.y,
      context.rows,
      context.cols,
      context.resizeBehavior,
      context.debugMode ? 1 : 0,
    );
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
