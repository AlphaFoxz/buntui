import {it, expect, describe} from 'bun:test';
import {KeyboardEvent, MouseEvent, WheelEvent, TermResizeEvent} from '../types';

// Modifier bitmask — matches events/types.ts
const MOD_SHIFT = 0x01;
const MOD_CTRL = 0x02;
const MOD_ALT = 0x04;
const MOD_META = 0x08;
const MOD_REPEAT = 0x10;

// Mouse flags — matches events/types.ts
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

function buildWheelPayload(modifiers: number, flags: number, button: number, buttons: number, x: number, y: number, wheelDeltaY: number): ArrayBuffer {
  const buf = new ArrayBuffer(9);
  const view = new DataView(buf);
  view.setUint8(0, modifiers);
  view.setUint8(1, flags);
  view.setUint8(2, button);
  view.setUint8(3, buttons);
  view.setUint16(4, x, true);
  view.setUint16(6, y, true);
  view.setInt8(8, wheelDeltaY);
  return buf;
}

function buildTermResizePayload(rows: number, cols: number): ArrayBuffer {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint16(0, rows, true);
  view.setUint16(2, cols, true);
  return buf;
}

describe('KeyboardEvent', () => {
  it('parses ASCII key', () => {
    const buf = buildKeyboardPayload(0, 97, 'a');
    const event = new KeyboardEvent(buf);
    expect(event.key).toBe('a');
    expect(event.charCode).toBe(97);
    expect(event.shiftKey).toBe(false);
    expect(event.ctrlKey).toBe(false);
    expect(event.altKey).toBe(false);
    expect(event.metaKey).toBe(false);
    expect(event.repeat).toBe(false);
  });

  it('parses special key name', () => {
    const buf = buildKeyboardPayload(0, 0x1B, 'Escape');
    const event = new KeyboardEvent(buf);
    expect(event.key).toBe('Escape');
    expect(event.charCode).toBe(0x1B);
  });

  it('parses CJK key', () => {
    const buf = buildKeyboardPayload(0, 0x4F_60, '你');
    const event = new KeyboardEvent(buf);
    expect(event.key).toBe('你');
    expect(event.charCode).toBe(0x4F_60);
  });

  it('parses shift modifier', () => {
    const buf = buildKeyboardPayload(MOD_SHIFT, 65, 'A');
    const event = new KeyboardEvent(buf);
    expect(event.shiftKey).toBe(true);
    expect(event.ctrlKey).toBe(false);
  });

  it('parses ctrl modifier', () => {
    const buf = buildKeyboardPayload(MOD_CTRL, 1, 'a');
    const event = new KeyboardEvent(buf);
    expect(event.ctrlKey).toBe(true);
    expect(event.shiftKey).toBe(false);
  });

  it('parses alt modifier', () => {
    const buf = buildKeyboardPayload(MOD_ALT, 97, 'a');
    const event = new KeyboardEvent(buf);
    expect(event.altKey).toBe(true);
  });

  it('parses meta modifier', () => {
    const buf = buildKeyboardPayload(MOD_META, 97, 'a');
    const event = new KeyboardEvent(buf);
    expect(event.metaKey).toBe(true);
  });

  it('parses repeat flag', () => {
    const buf = buildKeyboardPayload(MOD_REPEAT, 97, 'a');
    const event = new KeyboardEvent(buf);
    expect(event.repeat).toBe(true);
  });

  it('parses combined modifiers', () => {
    const buf = buildKeyboardPayload(MOD_SHIFT | MOD_CTRL, 97, 'a');
    const event = new KeyboardEvent(buf);
    expect(event.shiftKey).toBe(true);
    expect(event.ctrlKey).toBe(true);
    expect(event.altKey).toBe(false);
    expect(event.metaKey).toBe(false);
    expect(event.repeat).toBe(false);
  });

  it('parses all modifiers combined', () => {
    const buf = buildKeyboardPayload(MOD_SHIFT | MOD_CTRL | MOD_ALT | MOD_META | MOD_REPEAT, 97, 'a');
    const event = new KeyboardEvent(buf);
    expect(event.shiftKey).toBe(true);
    expect(event.ctrlKey).toBe(true);
    expect(event.altKey).toBe(true);
    expect(event.metaKey).toBe(true);
    expect(event.repeat).toBe(true);
  });

  it('returns undefined key when key_len is 0', () => {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint8(0, 0);
    view.setUint16(1, 0, true);
    view.setUint8(3, 0); // key_len = 0
    const event = new KeyboardEvent(buf);
    expect(event.key).toBeUndefined();
  });
});

describe('MouseEvent', () => {
  it('parses left click with button and position', () => {
    const buf = buildMousePayload(0, HAS_BUTTON, 0, 0, 23, 45);
    const event = new MouseEvent(buf);
    expect(event.button).toBe(0);
    expect(event.buttons).toBeUndefined();
    expect(event.x).toBe(23);
    expect(event.y).toBe(45);
    expect(event.isRelease).toBe(false);
    expect(event.shiftKey).toBe(false);
  });

  it('parses right click', () => {
    const buf = buildMousePayload(0, HAS_BUTTON, 2, 0, 10, 20);
    const event = new MouseEvent(buf);
    expect(event.button).toBe(2);
  });

  it('parses buttons (drag state)', () => {
    const buf = buildMousePayload(0, HAS_BUTTONS, 0, 1, 15, 25);
    const event = new MouseEvent(buf);
    expect(event.button).toBeUndefined(); // HAS_BUTTON not set
    expect(event.buttons).toBe(1);
  });

  it('parses both button and buttons', () => {
    const buf = buildMousePayload(0, HAS_BUTTON | HAS_BUTTONS, 0, 1, 15, 25);
    const event = new MouseEvent(buf);
    expect(event.button).toBe(0);
    expect(event.buttons).toBe(1);
  });

  it('parses release flag', () => {
    const buf = buildMousePayload(0, IS_RELEASE, 0, 0, 10, 20);
    const event = new MouseEvent(buf);
    expect(event.isRelease).toBe(true);
  });

  it('parses modifiers', () => {
    const buf = buildMousePayload(MOD_SHIFT | MOD_CTRL, HAS_BUTTON, 0, 0, 5, 5);
    const event = new MouseEvent(buf);
    expect(event.shiftKey).toBe(true);
    expect(event.ctrlKey).toBe(true);
    expect(event.altKey).toBe(false);
  });

  it('parses zero position', () => {
    const buf = buildMousePayload(0, HAS_BUTTON, 0, 0, 0, 0);
    const event = new MouseEvent(buf);
    expect(event.x).toBe(0);
    expect(event.y).toBe(0);
  });

  it('button is undefined without HAS_BUTTON flag', () => {
    const buf = buildMousePayload(0, 0, 0, 0, 5, 5);
    const event = new MouseEvent(buf);
    expect(event.button).toBeUndefined();
  });

  it('buttons is undefined without HAS_BUTTONS flag', () => {
    const buf = buildMousePayload(0, HAS_BUTTON, 0, 0, 5, 5);
    const event = new MouseEvent(buf);
    expect(event.buttons).toBeUndefined();
  });
});

describe('WheelEvent', () => {
  it('inherits MouseEvent fields', () => {
    const buf = buildWheelPayload(MOD_CTRL, HAS_BUTTON, 1, 0, 23, 45, -1);
    const event = new WheelEvent(buf);
    expect(event.x).toBe(23);
    expect(event.y).toBe(45);
    expect(event.ctrlKey).toBe(true);
    expect(event.button).toBe(1);
  });

  it('parses negative wheel delta (scroll up)', () => {
    const buf = buildWheelPayload(0, HAS_BUTTON, 1, 0, 10, 10, -1);
    const event = new WheelEvent(buf);
    expect(event.wheelDeltaY).toBe(-1);
  });

  it('parses positive wheel delta (scroll down)', () => {
    const buf = buildWheelPayload(0, HAS_BUTTON, 1, 0, 10, 10, 1);
    const event = new WheelEvent(buf);
    expect(event.wheelDeltaY).toBe(1);
  });

  it('parses large wheel delta', () => {
    const buf = buildWheelPayload(0, HAS_BUTTON, 1, 0, 10, 10, -5);
    const event = new WheelEvent(buf);
    expect(event.wheelDeltaY).toBe(-5);
  });
});

describe('TermResizeEvent', () => {
  it('parses rows and cols', () => {
    const buf = buildTermResizePayload(50, 120);
    const event = new TermResizeEvent(buf);
    expect(event.rows).toBe(50);
    expect(event.cols).toBe(120);
  });

  it('parses small terminal size', () => {
    const buf = buildTermResizePayload(1, 1);
    const event = new TermResizeEvent(buf);
    expect(event.rows).toBe(1);
    expect(event.cols).toBe(1);
  });
});
