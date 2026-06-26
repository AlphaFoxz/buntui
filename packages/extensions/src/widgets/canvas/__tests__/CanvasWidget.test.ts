import {it, expect, describe} from 'bun:test';
import {CanvasWidget, createCanvasWidget} from '../CanvasWidget';
import type {CanvasCell} from '../types';

type DrawCharCall = {
  x: number;
  y: number;
  char: number;
  fgRgba: number;
  bgRgba: number;
};

function createSpyBuffer() {
  const calls: {
    pushClip: Array<{x: number; y: number; width: number; height: number}>;
    popClip: number[];
    drawChar: DrawCharCall[];
  } = {pushClip: [], popClip: [], drawChar: []};

  return {
    calls,
    buffer: {
      pushClip(x: number, y: number, width: number, height: number) {
        calls.pushClip.push({x, y, width, height});
      },
      popClip() {
        calls.popClip.push(1);
      },
      drawChar(props: DrawCharCall) {
        calls.drawChar.push({...props});
      },
    },
  };
}

describe('CanvasWidget', () => {
  it('constructs with width and height', () => {
    const canvas = new CanvasWidget({width: 10, height: 5});
    expect(canvas.rect.width).toBe(10);
    expect(canvas.rect.height).toBe(5);
    expect(canvas.rect.x).toBe(0);
    expect(canvas.rect.y).toBe(0);
  });

  it('constructs with position', () => {
    const canvas = new CanvasWidget({x: 3, y: 7, width: 10, height: 5});
    expect(canvas.rect.x).toBe(3);
    expect(canvas.rect.y).toBe(7);
  });

  it('intrinsicSize returns dimensions', () => {
    const canvas = new CanvasWidget({width: 8, height: 4});
    expect(canvas.intrinsicSize()).toEqual({width: 8, height: 4});
  });

  it('containsPoint respects rect', () => {
    const canvas = new CanvasWidget({x: 5, y: 5, width: 10, height: 5});
    expect(canvas.containsPoint(5, 5)).toBe(true);
    expect(canvas.containsPoint(14, 9)).toBe(true);
    expect(canvas.containsPoint(4, 5)).toBe(false);
    expect(canvas.containsPoint(15, 5)).toBe(false);
    expect(canvas.containsPoint(5, 4)).toBe(false);
    expect(canvas.containsPoint(5, 10)).toBe(false);
  });
});

describe('CanvasWidget cell API', () => {
  it('setCell and getCell basic round-trip', () => {
    const canvas = new CanvasWidget({width: 4, height: 3});
    canvas.setCell(1, 2, 0x2588, 0xffffffff);
    const cell = canvas.getCell(1, 2);
    expect(cell).toEqual({char: 0x2588, fgRgba: 0xffffffff, bgRgba: 0});
  });

  it('setCell with bgRgba', () => {
    const canvas = new CanvasWidget({width: 4, height: 3});
    canvas.setCell(0, 0, 0x41, 0xff0000ff, 0x00ff00ff);
    const cell = canvas.getCell(0, 0);
    expect(cell).toEqual({char: 0x41, fgRgba: 0xff0000ff, bgRgba: 0x00ff00ff});
  });

  it('getCell returns undefined for empty cell', () => {
    const canvas = new CanvasWidget({width: 4, height: 3});
    expect(canvas.getCell(0, 0)).toBeUndefined();
  });

  it('setCell out of bounds is ignored', () => {
    const canvas = new CanvasWidget({width: 4, height: 3});
    canvas.setCell(-1, 0, 0x41, 0xffffffff);
    canvas.setCell(4, 0, 0x41, 0xffffffff);
    canvas.setCell(0, -1, 0x41, 0xffffffff);
    canvas.setCell(0, 3, 0x41, 0xffffffff);
    expect(canvas.getCell(-1, 0)).toBeUndefined();
    expect(canvas.getCell(4, 0)).toBeUndefined();
  });

  it('getCell out of bounds returns undefined', () => {
    const canvas = new CanvasWidget({width: 4, height: 3});
    expect(canvas.getCell(-1, 0)).toBeUndefined();
    expect(canvas.getCell(4, 3)).toBeUndefined();
  });

  it('clear removes all cells', () => {
    const canvas = new CanvasWidget({width: 4, height: 3});
    canvas.setCell(0, 0, 0x41, 0xffffffff);
    canvas.setCell(1, 1, 0x42, 0xffffffff);
    canvas.clear();
    expect(canvas.getCell(0, 0)).toBeUndefined();
    expect(canvas.getCell(1, 1)).toBeUndefined();
  });

  it('fill sets all cells to same value', () => {
    const canvas = new CanvasWidget({width: 2, height: 2});
    canvas.fill(0x2588, 0xffffffff, 0x000000ff);
    expect(canvas.getCell(0, 0)).toEqual({char: 0x2588, fgRgba: 0xffffffff, bgRgba: 0x000000ff});
    expect(canvas.getCell(1, 0)).toEqual({char: 0x2588, fgRgba: 0xffffffff, bgRgba: 0x000000ff});
    expect(canvas.getCell(0, 1)).toEqual({char: 0x2588, fgRgba: 0xffffffff, bgRgba: 0x000000ff});
    expect(canvas.getCell(1, 1)).toEqual({char: 0x2588, fgRgba: 0xffffffff, bgRgba: 0x000000ff});
  });

  it('setCells populates from flat row-major array', () => {
    const canvas = new CanvasWidget({width: 3, height: 2});
    const cells: CanvasCell[] = [
      {char: 0x41, fgRgba: 0xff0000ff, bgRgba: 0},
      {char: 0x42, fgRgba: 0x00ff00ff, bgRgba: 0},
      {char: 0x43, fgRgba: 0x0000ffff, bgRgba: 0},
      {char: 0, fgRgba: 0, bgRgba: 0},
      {char: 0x44, fgRgba: 0xffffffff, bgRgba: 0},
      {char: 0, fgRgba: 0, bgRgba: 0},
    ];
    canvas.setCells(cells);
    expect(canvas.getCell(0, 0)?.char).toBe(0x41);
    expect(canvas.getCell(1, 0)?.char).toBe(0x42);
    expect(canvas.getCell(2, 0)?.char).toBe(0x43);
    expect(canvas.getCell(0, 1)).toBeUndefined();
    expect(canvas.getCell(1, 1)?.char).toBe(0x44);
    expect(canvas.getCell(2, 1)).toBeUndefined();
  });

  it('setCells via constructor options', () => {
    const cells: CanvasCell[] = [
      {char: 0x41, fgRgba: 0xffffffff, bgRgba: 0},
      {char: 0, fgRgba: 0, bgRgba: 0},
    ];
    const canvas = new CanvasWidget({width: 2, height: 1, cells});
    expect(canvas.getCell(0, 0)?.char).toBe(0x41);
    expect(canvas.getCell(1, 0)).toBeUndefined();
  });

  it('setCells replaces previous content', () => {
    const canvas = new CanvasWidget({width: 2, height: 1});
    canvas.setCell(0, 0, 0x41, 0xffffffff);
    canvas.setCell(1, 0, 0x42, 0xffffffff);
    canvas.setCells([{char: 0x43, fgRgba: 0xffffffff, bgRgba: 0}]);
    expect(canvas.getCell(0, 0)?.char).toBe(0x43);
    expect(canvas.getCell(1, 0)).toBeUndefined();
  });
});

describe('CanvasWidget emitDrawCommands', () => {
  it('pushes clip with widget rect', () => {
    const canvas = new CanvasWidget({x: 5, y: 3, width: 10, height: 5});
    const spy = createSpyBuffer();
    canvas.emitDrawCommands(spy.buffer as any);
    expect(spy.calls.pushClip).toHaveLength(1);
    expect(spy.calls.pushClip[0]).toEqual({x: 5, y: 3, width: 10, height: 5});
    expect(spy.calls.popClip).toHaveLength(1);
  });

  it('emits drawChar for each non-empty cell', () => {
    const canvas = new CanvasWidget({x: 0, y: 0, width: 3, height: 2});
    canvas.setCell(0, 0, 0x41, 0xff0000ff);
    canvas.setCell(2, 1, 0x42, 0x00ff00ff, 0x000000ff);
    const spy = createSpyBuffer();
    canvas.emitDrawCommands(spy.buffer as any);
    expect(spy.calls.drawChar).toHaveLength(2);
    expect(spy.calls.drawChar[0]).toEqual({x: 0, y: 0, char: 0x41, fgRgba: 0xff0000ff, bgRgba: 0});
    expect(spy.calls.drawChar[1]).toEqual({x: 2, y: 1, char: 0x42, fgRgba: 0x00ff00ff, bgRgba: 0x000000ff});
  });

  it('offsets cell positions by widget x/y', () => {
    const canvas = new CanvasWidget({x: 10, y: 20, width: 2, height: 1});
    canvas.setCell(1, 0, 0x41, 0xffffffff);
    const spy = createSpyBuffer();
    canvas.emitDrawCommands(spy.buffer as any);
    expect(spy.calls.drawChar[0]).toEqual({x: 11, y: 20, char: 0x41, fgRgba: 0xffffffff, bgRgba: 0});
  });

  it('skips empty cells', () => {
    const canvas = new CanvasWidget({width: 3, height: 3});
    canvas.setCell(1, 1, 0x41, 0xffffffff);
    const spy = createSpyBuffer();
    canvas.emitDrawCommands(spy.buffer as any);
    expect(spy.calls.drawChar).toHaveLength(1);
  });

  it('does nothing for zero-size canvas', () => {
    const canvas = new CanvasWidget({width: 0, height: 0});
    const spy = createSpyBuffer();
    canvas.emitDrawCommands(spy.buffer as any);
    expect(spy.calls.pushClip).toHaveLength(0);
    expect(spy.calls.drawChar).toHaveLength(0);
  });
});

describe('CanvasWidget updateRect', () => {
  it('updates position', () => {
    const canvas = new CanvasWidget({x: 0, y: 0, width: 5, height: 5});
    canvas.updateRect({x: 10, y: 20});
    expect(canvas.rect.x).toBe(10);
    expect(canvas.rect.y).toBe(20);
  });

  it('updates size and resizes buffer', () => {
    const canvas = new CanvasWidget({width: 5, height: 5});
    canvas.setCell(0, 0, 0x41, 0xffffffff);
    canvas.updateRect({width: 10, height: 10});
    expect(canvas.rect.width).toBe(10);
    expect(canvas.rect.height).toBe(10);
    expect(canvas.getCell(0, 0)).toBeUndefined();
  });

  it('partial updateRect only changes provided fields', () => {
    const canvas = new CanvasWidget({x: 1, y: 2, width: 3, height: 4});
    canvas.updateRect({width: 10});
    expect(canvas.rect).toEqual({x: 1, y: 2, width: 10, height: 4});
  });
});

describe('createCanvasWidget factory', () => {
  it('creates a CanvasWidget instance', () => {
    const canvas = createCanvasWidget({width: 5, height: 3});
    expect(canvas).toBeInstanceOf(CanvasWidget);
    expect(canvas.rect.width).toBe(5);
  });

  it('works with no options', () => {
    const canvas = createCanvasWidget();
    expect(canvas).toBeInstanceOf(CanvasWidget);
  });
});
