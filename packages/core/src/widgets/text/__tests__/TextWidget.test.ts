import {it, expect, describe} from 'bun:test';
import {TextWidget, createTextWidget, DEFAULT_TEXT_OPTIONS} from '../TextWidget';

function createText(options?: {text?: string; rectX?: number; rectY?: number; rectWidth?: number; rectHeight?: number; colorFg?: number; colorBg?: number}) {
  return new TextWidget({
    text: options?.text ?? '',
    rectX: options?.rectX ?? 0,
    rectY: options?.rectY ?? 0,
    rectWidth: options?.rectWidth ?? 10,
    rectHeight: options?.rectHeight ?? 1,
    colorFg: options?.colorFg ?? 0xFF_FF_FF_FF,
    colorBg: options?.colorBg ?? 0x00_00_00_00,
  });
}

describe('construction', () => {
  it('initializes with custom options', () => {
    const widget = createText({text: 'Hello', rectX: 5, rectY: 10, rectWidth: 20, rectHeight: 3});
    expect(widget.text).toBe('Hello');
    const r = widget.rect;
    expect(r.rectX).toBe(5);
    expect(r.rectY).toBe(10);
    expect(r.rectWidth).toBe(20);
    expect(r.rectHeight).toBe(3);
  });

  it('initializes with defaults from DEFAULT_TEXT_OPTIONS', () => {
    expect(DEFAULT_TEXT_OPTIONS.text).toBe('');
    expect(DEFAULT_TEXT_OPTIONS.colorBg).toBe(0x00_00_00_00);
  });
});

describe('creator function', () => {
  it('createTextWidget with string shorthand', () => {
    const widget = createTextWidget('Hello');
    expect(widget.text).toBe('Hello');
  });

  it('createTextWidget with options object', () => {
    const widget = createTextWidget({text: 'World', rectX: 5, colorFg: 0xFF_00_00_FF});
    expect(widget.text).toBe('World');
    expect(widget.rect.rectX).toBe(5);
    expect(widget.color.colorFg).toBe(0xFF_00_00_FF);
  });
});

describe('update methods', () => {
  it('updateText changes text', () => {
    const widget = createText({text: 'Old'});
    widget.updateText('New');
    expect(widget.text).toBe('New');
  });

  it('updateRect changes position and size', () => {
    const widget = createText();
    widget.updateRect({rectX: 10, rectY: 20, rectWidth: 30, rectHeight: 5});
    const r = widget.rect;
    expect(r.rectX).toBe(10);
    expect(r.rectY).toBe(20);
    expect(r.rectWidth).toBe(30);
    expect(r.rectHeight).toBe(5);
  });

  it('updateRect partially updates fields', () => {
    const widget = createText({rectX: 5});
    widget.updateRect({rectX: 15});
    expect(widget.rect.rectX).toBe(15);
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
    const widget = createText({rectX: 5, rectY: 5, rectWidth: 10, rectHeight: 3});
    expect(widget.containsPoint(5, 5)).toBe(true);
    expect(widget.containsPoint(14, 5)).toBe(true);
    expect(widget.containsPoint(15, 5)).toBe(false);
    expect(widget.containsPoint(4, 5)).toBe(false);
    expect(widget.containsPoint(10, 7)).toBe(true);
    expect(widget.containsPoint(10, 8)).toBe(false);
  });
});
