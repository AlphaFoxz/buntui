import {it, expect, describe} from 'bun:test';
import {KeyboardEvent, MouseEvent, WheelEvent, TermResizeEvent} from '../../events/types';
import {
  serializeKeyboardEvent,
  serializeMouseEvent,
  serializeResizeEvent,
  type TerminalMouseEvent,
} from '../HtmlBackend';

const MOD_SHIFT = 0x01;
const MOD_CTRL = 0x02;
const MOD_ALT = 0x04;
const MOD_META = 0x08;
const MOD_REPEAT = 0x10;

const HAS_BUTTON = 0x01;
const HAS_BUTTONS = 0x02;
const IS_RELEASE = 0x10;

function buildKeyboardPayload(modifiers: number, charCode: number, key: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(key);
  const buf = new ArrayBuffer(4 + encoded.length);
  const view = new DataView(buf);
  view.setUint8(0, modifiers);
  view.setUint16(1, charCode, true);
  view.setUint8(3, encoded.length);
  new Uint8Array(buf).set(encoded, 4);
  return buf;
}

function buildMousePayload(modifiers: number, flags: number, button: number, buttons: number, x: number, y: number): ArrayBuffer {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint8(0, modifiers);
  view.setUint8(1, flags);
  view.setUint8(2, button);
  view.setUint8(3, buttons);
  view.setUint16(4, x, true);
  view.setUint16(6, y, true);
  return buf;
}

function buildTermResizePayload(rows: number, cols: number): ArrayBuffer {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint16(0, rows, true);
  view.setUint16(2, cols, true);
  return buf;
}

function expectBytesEqual(actual: ArrayBuffer, expected: ArrayBuffer): void {
  expect(actual.byteLength).toBe(expected.byteLength);
  const a = new Uint8Array(actual);
  const b = new Uint8Array(expected);
  for (let i = 0; i < a.length; i++) {
    expect(a[i]).toBe(b[i]);
  }
}

describe('serializeKeyboardEvent — byte parity with native format', () => {
  it('produces identical bytes for ASCII key', () => {
    const expected = buildKeyboardPayload(0, 97, 'a');
    const actual = serializeKeyboardEvent('a');
    expectBytesEqual(actual, expected);
  });

  it('produces identical bytes for special key', () => {
    const expected = buildKeyboardPayload(0, 0x1B, 'Escape');
    const actual = serializeKeyboardEvent('Escape', {shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, keyCode: 0x1B});
    expectBytesEqual(actual, expected);
  });

  it('produces identical bytes for CJK key', () => {
    const expected = buildKeyboardPayload(0, 0x4F_60, '你');
    const actual = serializeKeyboardEvent('你');
    expectBytesEqual(actual, expected);
  });

  it('produces identical bytes for shift modifier', () => {
    const expected = buildKeyboardPayload(MOD_SHIFT, 65, 'A');
    const actual = serializeKeyboardEvent('A', {shiftKey: true, ctrlKey: false, altKey: false, metaKey: false, repeat: false, keyCode: 65});
    expectBytesEqual(actual, expected);
  });

  it('produces identical bytes for ctrl modifier', () => {
    const expected = buildKeyboardPayload(MOD_CTRL, 97, 'a');
    const actual = serializeKeyboardEvent('a', {shiftKey: false, ctrlKey: true, altKey: false, metaKey: false, repeat: false, keyCode: 97});
    expectBytesEqual(actual, expected);
  });

  it('produces identical bytes for all modifiers + repeat', () => {
    const expected = buildKeyboardPayload(MOD_SHIFT | MOD_CTRL | MOD_ALT | MOD_META | MOD_REPEAT, 97, 'a');
    const actual = serializeKeyboardEvent('a', {shiftKey: true, ctrlKey: true, altKey: true, metaKey: true, repeat: true, keyCode: 97});
    expectBytesEqual(actual, expected);
  });

  it('produces zero modifiers without domEvent', () => {
    const expected = buildKeyboardPayload(0, 97, 'a');
    const actual = serializeKeyboardEvent('a');
    expectBytesEqual(actual, expected);
  });
});

describe('serializeMouseEvent — byte parity with native format', () => {
  it('produces identical bytes for left click', () => {
    const expected = buildMousePayload(0, HAS_BUTTON, 0, 0, 10, 20);
    const actual = serializeMouseEvent({col: 9, row: 19, button: 0, buttons: undefined as unknown as number, action: 'mousedown'});
    expectBytesEqual(actual, expected);
  });

  it('produces identical bytes for right click', () => {
    const expected = buildMousePayload(0, HAS_BUTTON, 2, 0, 5, 5);
    const actual = serializeMouseEvent({col: 4, row: 4, button: 2, buttons: undefined as unknown as number, action: 'mousedown'});
    expectBytesEqual(actual, expected);
  });

  it('produces IS_RELEASE flag for mouseup', () => {
    const expected = buildMousePayload(0, IS_RELEASE, 0, 0, 10, 20);
    const actual = serializeMouseEvent({col: 9, row: 19, button: undefined as unknown as number, buttons: undefined as unknown as number, action: 'mouseup'});
    expectBytesEqual(actual, expected);
  });

  it('produces HAS_BUTTONS flag', () => {
    const expected = buildMousePayload(0, HAS_BUTTONS, 0, 3, 15, 25);
    const actual = serializeMouseEvent({col: 14, row: 24, button: undefined as unknown as number, buttons: 3, action: 'mousemove'});
    expectBytesEqual(actual, expected);
  });

  it('produces both HAS_BUTTON and HAS_BUTTONS', () => {
    const expected = buildMousePayload(0, HAS_BUTTON | HAS_BUTTONS, 0, 1, 15, 25);
    const actual = serializeMouseEvent({col: 14, row: 24, button: 0, buttons: 1, action: 'mousemove'});
    expectBytesEqual(actual, expected);
  });

  it('produces zero-based to one-based offset (col+1, row+1)', () => {
    const expected = buildMousePayload(0, HAS_BUTTON, 0, 0, 1, 1);
    const actual = serializeMouseEvent({col: 0, row: 0, button: 0, buttons: undefined as unknown as number, action: 'mousedown'});
    expectBytesEqual(actual, expected);
  });
});

describe('serializeResizeEvent — byte parity with native format', () => {
  it('produces identical bytes for normal size', () => {
    const expected = buildTermResizePayload(50, 120);
    const actual = serializeResizeEvent(50, 120);
    expectBytesEqual(actual, expected);
  });

  it('produces identical bytes for small size', () => {
    const expected = buildTermResizePayload(1, 1);
    const actual = serializeResizeEvent(1, 1);
    expectBytesEqual(actual, expected);
  });
});

describe('round-trip: serialize → parse', () => {
  it('keyboard event survives round-trip', () => {
    const buf = serializeKeyboardEvent('x', {shiftKey: true, ctrlKey: false, altKey: true, metaKey: false, repeat: true, keyCode: 120});
    const event = new KeyboardEvent(buf);
    expect(event.key).toBe('x');
    expect(event.shiftKey).toBe(true);
    expect(event.ctrlKey).toBe(false);
    expect(event.altKey).toBe(true);
    expect(event.metaKey).toBe(false);
    expect(event.repeat).toBe(true);
  });

  it('mouse click survives round-trip', () => {
    const buf = serializeMouseEvent({col: 9, row: 19, button: 0, buttons: undefined as unknown as number, action: 'mousedown'});
    const event = new MouseEvent(buf);
    expect(event.button).toBe(0);
    expect(event.x).toBe(9);
    expect(event.y).toBe(19);
    expect(event.isRelease).toBe(false);
  });

  it('mouse release survives round-trip', () => {
    const buf = serializeMouseEvent({col: 4, row: 4, button: undefined as unknown as number, buttons: undefined as unknown as number, action: 'mouseup'});
    const event = new MouseEvent(buf);
    expect(event.isRelease).toBe(true);
    expect(event.x).toBe(4);
    expect(event.y).toBe(4);
  });

  it('resize event survives round-trip', () => {
    const buf = serializeResizeEvent(40, 100);
    const event = new TermResizeEvent(buf);
    expect(event.rows).toBe(40);
    expect(event.cols).toBe(100);
  });
});
