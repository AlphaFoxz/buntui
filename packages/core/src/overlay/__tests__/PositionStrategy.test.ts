import {it, expect, describe} from 'bun:test';
import {resolvePosition, type PositionStrategy} from '../PositionStrategy';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {TuiWidgetEntity} from '../../widgets/TuiWidgetEntity';

const TERM_COLS = 80;
const TERM_ROWS = 24;

class StubAnchor extends TuiWidgetEntity {
  override emitDrawCommands(_buf: DrawListBuffer): void {}
  override get rect() {
    return this._rect;
  }

  _rect: {x: number; y: number; width: number; height: number} = {x: 0, y: 0, width: 10, height: 3};
}

describe('absolute strategy', () => {
  it('uses exact coordinates', () => {
    const pos = resolvePosition(
      {type: 'absolute', x: 5, y: 10},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 5, y: 10});
  });

  it('clamps to terminal bounds', () => {
    const pos = resolvePosition(
      {type: 'absolute', x: -1, y: 100},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(TERM_ROWS - 1);
  });

  it('clamps negative coordinates to zero', () => {
    const pos = resolvePosition(
      {type: 'absolute', x: -5, y: -3},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 0, y: 0});
  });
});

describe('anchor strategy', () => {
  it('places below anchor (bottom)', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 10, y: 5, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'bottom'},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 10, y: 8});
  });

  it('places above anchor (top)', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 10, y: 10, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'top'},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 10, y: 5});
  });

  it('places right of anchor (right)', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 10, y: 5, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'right'},
      {width: 8, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 20, y: 5});
  });

  it('places left of anchor (left)', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 20, y: 5, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'left'},
      {width: 8, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 12, y: 5});
  });

  it('applies offset', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 10, y: 5, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'bottom', offset: 2},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 10, y: 10});
  });

  it('applies offset for top placement', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 10, y: 10, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'top', offset: 1},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 10, y: 4});
  });
});

describe('anchor edgeClamp', () => {
  it('flips bottom to top when not enough space below', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 10, y: 20, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'bottom', edgeClamp: true},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos.y).toBe(15);
  });

  it('flips top to bottom when not enough space above', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 10, y: 3, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'top', edgeClamp: true},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos.y).toBe(6);
  });

  it('flips right to left when not enough space to the right', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 70, y: 5, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'right', edgeClamp: true},
      {width: 15, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos.x).toBe(55);
  });

  it('flips left to right when not enough space to the left', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 5, y: 5, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'left', edgeClamp: true},
      {width: 15, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos.x).toBe(15);
  });

  it('does not flip when there is enough space', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 10, y: 5, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'bottom', edgeClamp: true},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 10, y: 8});
  });

  it('clamps to terminal boundary when neither side has enough space', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 10, y: 2, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'bottom', edgeClamp: true},
      {width: 30, height: 20},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos.x).toBe(10);
    expect(pos.y).toBe(4);
  });

  it('clamps position to not exceed terminal right edge', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 70, y: 5, width: 8, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'bottom', edgeClamp: true},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos.x).toBe(TERM_COLS - 20);
    expect(pos.y).toBe(8);
  });

  it('flips with offset when offset pushes widget off-screen', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 10, y: 20, width: 10, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'bottom', offset: 2, edgeClamp: true},
      {width: 20, height: 1},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos.y).toBe(17);
  });

  it('flips left with offset when offset pushes widget off-screen', () => {
    const anchor = new StubAnchor();
    anchor._rect = {x: 75, y: 5, width: 5, height: 3};
    const pos = resolvePosition(
      {type: 'anchor', anchor, placement: 'right', offset: 3, edgeClamp: true},
      {width: 5, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos.x).toBe(67);
  });
});

describe('center strategy', () => {
  it('centers widget in terminal', () => {
    const pos = resolvePosition(
      {type: 'center'},
      {width: 40, height: 10},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 20, y: 7});
  });

  it('centers odd-sized widget', () => {
    const pos = resolvePosition(
      {type: 'center'},
      {width: 41, height: 11},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 19, y: 6});
  });

  it('clamps to zero when widget is larger than terminal', () => {
    const pos = resolvePosition(
      {type: 'center'},
      {width: 100, height: 30},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 0, y: 0});
  });

  it('centers widget equal to terminal size', () => {
    const pos = resolvePosition(
      {type: 'center'},
      {width: TERM_COLS, height: TERM_ROWS},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 0, y: 0});
  });
});

describe('corner strategy', () => {
  it('places at top-left', () => {
    const pos = resolvePosition(
      {type: 'corner', corner: 'top-left'},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 0, y: 0});
  });

  it('places at top-right', () => {
    const pos = resolvePosition(
      {type: 'corner', corner: 'top-right'},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 60, y: 0});
  });

  it('places at bottom-left', () => {
    const pos = resolvePosition(
      {type: 'corner', corner: 'bottom-left'},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 0, y: 19});
  });

  it('places at bottom-right', () => {
    const pos = resolvePosition(
      {type: 'corner', corner: 'bottom-right'},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 60, y: 19});
  });

  it('applies margin', () => {
    const pos = resolvePosition(
      {type: 'corner', corner: 'top-left', margin: 2},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 2, y: 2});
  });

  it('applies margin for bottom-right', () => {
    const pos = resolvePosition(
      {type: 'corner', corner: 'bottom-right', margin: 3},
      {width: 20, height: 5},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: TERM_COLS - 20 - 3, y: TERM_ROWS - 5 - 3});
  });

  it('clamps to zero when widget + margin exceeds terminal', () => {
    const pos = resolvePosition(
      {type: 'corner', corner: 'bottom-right', margin: 5},
      {width: 80, height: 24},
      TERM_COLS,
      TERM_ROWS,
    );
    expect(pos).toEqual({x: 0, y: 0});
  });
});
