import TuiDataViewWrapper from '../extern/TuiDataViewWrapper';
import {
  FLAG_HAS_BUTTON,
  FLAG_HAS_BUTTONS,
  FLAG_IS_RELEASE,
  MOD_ALT,
  MOD_CTRL,
  MOD_META,
  MOD_REPEAT,
  MOD_SHIFT,
} from './types';

// Matches the DOM KeyboardEvent subset consumed by backends.
export type DomKeyboardEvent = {
  readonly key?: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly keyCode: number;
};

export type TerminalMouseEvent = {col: number; row: number; button?: number; buttons?: number; action: string};

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
    flags |= FLAG_IS_RELEASE;
  }

  if (event.button !== undefined) {
    flags |= FLAG_HAS_BUTTON;
  }

  if (event.buttons !== undefined) {
    flags |= FLAG_HAS_BUTTONS;
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
  view.setUint8(1, FLAG_HAS_BUTTON);
  view.setUint8(2, 0);
  view.setUint8(3, 0);
  view.setUint16(4, col + 1, true);
  view.setUint16(6, row + 1, true);
  view.setInt8(8, deltaY);
  return buf;
}

export function serializeCtrlV(): ArrayBuffer {
  const buf = new ArrayBuffer(4 + 1);
  const view = new TuiDataViewWrapper(buf);
  view.setUint8(0, MOD_CTRL);
  view.setUint16(1, 86, true);
  view.setUint8(3, 1);
  const encoded = new TextEncoder().encode('v');
  new Uint8Array(buf).set(encoded, 4);
  return buf;
}
