import {it, expect, describe} from 'bun:test';
import {TextWidget, createTextWidget, DEFAULT_TEXT_OPTIONS} from '../TextWidget';

function createText(options?: {value?: string; x?: number; y?: number; width?: number; height?: number; colorFg?: number; colorBg?: number}) {
  return new TextWidget({
    value: options?.value ?? '',
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 10,
    height: options?.height ?? 1,
    colorFg: options?.colorFg ?? 0xFF_FF_FF_FF,
    colorBg: options?.colorBg ?? 0x00_00_00_00,
  });
}

describe('construction', () => {
  it('initializes with custom options', () => {
    const widget = createText({value: 'Hello', x: 5, y: 10, width: 20, height: 3});
    expect(widget.value).toBe('Hello');
    const r = widget.rect;
    expect(r.x).toBe(5);
    expect(r.y).toBe(10);
    expect(r.width).toBe(20);
    expect(r.height).toBe(3);
  });

  it('initializes with defaults from DEFAULT_TEXT_OPTIONS', () => {
    expect(DEFAULT_TEXT_OPTIONS.value).toBe('');
  });
});

describe('creator function', () => {
  it('createTextWidget with string shorthand', () => {
    const widget = createTextWidget('Hello');
    expect(widget.value).toBe('Hello');
  });

  it('createTextWidget with options object', () => {
    const widget = createTextWidget({value: 'World', x: 5, colorFg: 0xFF_00_00_FF});
    expect(widget.value).toBe('World');
    expect(widget.rect.x).toBe(5);
    expect(widget.color.colorFg).toBe(0xFF_00_00_FF);
  });
});

describe('update methods', () => {
  it('updateValue changes value', () => {
    const widget = createText({value: 'Old'});
    widget.updateValue('New');
    expect(widget.value).toBe('New');
  });

  it('updateRect changes position and size', () => {
    const widget = createText();
    widget.updateRect({x: 10, y: 20, width: 30, height: 5});
    const r = widget.rect;
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.width).toBe(30);
    expect(r.height).toBe(5);
  });

  it('updateRect partially updates fields', () => {
    const widget = createText({x: 5});
    widget.updateRect({x: 15});
    expect(widget.rect.x).toBe(15);
  });

  it('updateColor changes colors', () => {
    const widget = createText();
    widget.updateColor({colorFg: 0xFF_00_00_FF, colorBg: 0x00_00_FF_FF});
    expect(widget.color.colorFg).toBe(0xFF_00_00_FF);
    expect(widget.color.colorBg).toBe(0x00_00_FF_FF);
  });

  it('updateStyle changes zIndex', () => {
    const widget = createText();
    widget.updateStyle({styleZIndex: 5});
    expect(widget.zIndex).toBe(5);
  });
});

describe('hit testing', () => {
  it('containsPoint checks bounds', () => {
    const widget = createText({x: 5, y: 5, width: 10, height: 3});
    expect(widget.containsPoint(5, 5)).toBe(true);
    expect(widget.containsPoint(14, 5)).toBe(true);
    expect(widget.containsPoint(15, 5)).toBe(false);
    expect(widget.containsPoint(4, 5)).toBe(false);
    expect(widget.containsPoint(10, 7)).toBe(true);
    expect(widget.containsPoint(10, 8)).toBe(false);
  });
});
