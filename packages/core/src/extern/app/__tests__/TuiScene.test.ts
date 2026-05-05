import {it, expect, describe} from 'bun:test';
import {TuiScene} from '../TuiScene';
import type {DrawListBuffer} from '../../../draw_list/DrawListBuffer';
import type {MouseEvent} from '../../../events/types';
import {TuiWidgetEntity} from '../../../widgets/TuiWidgetEntity';

class StubWidget extends TuiWidgetEntity {
  _zIndex = 0;
  override emitDrawCommands(_buf: DrawListBuffer): void {}
  override containsPoint(x: number, y: number): boolean {
    return x >= this._rect.x && x < this._rect.x + this._rect.width
      && y >= this._rect.y && y < this._rect.y + this._rect.height;
  }

  override get rect() {
    return this._rect;
  }

  override get zIndex(): number {
    return this._zIndex;
  }

  override updateRect(rect: Partial<{x: U16; y: U16; width: U16; height: U16}>): void {
    Object.assign(this._rect, rect);
  }

  _rect: {x: number; y: number; width: number; height: number} = {x: 0, y: 0, width: 10, height: 5};
}

function createWidget(rect?: {x?: number; y?: number; width?: number; height?: number; zIndex?: number}): StubWidget {
  const widget = new StubWidget();
  if (rect) {
    widget._rect = {
      x: rect.x ?? 0,
      y: rect.y ?? 0,
      width: rect.width ?? 10,
      height: rect.height ?? 5,
    };
    if (rect.zIndex !== undefined) {
      widget._zIndex = rect.zIndex;
    }
  }

  return widget;
}

function mouseEvent(x: number, y: number): MouseEvent {
  return {
    button: 0,
    buttons: 1,
    x,
    y,
    isRelease: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
  };
}

describe('construction', () => {
  it('creates with default options', () => {
    const scene = new TuiScene();
    expect(scene.visible).toBe(false);
    expect(scene.id).toBeDefined();
  });

  it('creates with visible option', () => {
    const scene = new TuiScene({visible: true});
    expect(scene.visible).toBe(true);
  });

  it('creates with bgHexRgb option', () => {
    const scene = new TuiScene({bgHexRgb: '#ff0000'});
    expect(scene.bgHexRgb).toBeDefined();
  });
});

describe('visible', () => {
  it('setVisible changes visibility', () => {
    const scene = new TuiScene();
    scene.setVisible(true);
    expect(scene.visible).toBe(true);
    scene.setVisible(false);
    expect(scene.visible).toBe(false);
  });
});

describe('setBgRgb', () => {
  it('accepts a hex string', () => {
    const scene = new TuiScene();
    scene.setBgRgb('#ff0000');
    expect(scene.bgHexRgb).toBeDefined();
  });

  it('accepts r, g, b numbers', () => {
    const scene = new TuiScene();
    scene.setBgRgb(255, 0, 0);
    expect(scene.bgHexRgb).toBeDefined();
  });

  it('accepts an rgb object', () => {
    const scene = new TuiScene();
    scene.setBgRgb({r: 255, g: 0, b: 0});
    expect(scene.bgHexRgb).toBeDefined();
  });

  it('accepts a number', () => {
    const scene = new TuiScene();
    scene.setBgRgb(0xff0000);
    expect(scene.bgHexRgb).toBeDefined();
  });
});

describe('mount / unmount', () => {
  it('mount adds widget and calls mounted', () => {
    const scene = new TuiScene();
    const widget = createWidget();
    scene.mount(widget);
    expect(widget.refrenceCount).toBe(1);
  });

  it('mount returns the scene for chaining', () => {
    const scene = new TuiScene();
    const result = scene.mount(createWidget());
    expect(result).toBe(scene);
  });

  it('unmount removes widget and calls unmounted', () => {
    const scene = new TuiScene();
    const widget = createWidget();
    scene.mount(widget);
    scene.unmount(widget);
    expect(widget.refrenceCount).toBe(0);
  });

  it('unmount returns the scene for chaining', () => {
    const scene = new TuiScene();
    const widget = createWidget();
    scene.mount(widget);
    const result = scene.unmount(widget);
    expect(result).toBe(scene);
  });

  it('unmount with non-mounted widget still calls unmounted', () => {
    const scene = new TuiScene();
    const widget = createWidget();
    scene.unmount(widget);
    // TuiScene.unmount calls widget.unmounted() regardless of membership
    expect(widget.refrenceCount).toBe(-1);
  });
});

describe('hitTest', () => {
  it('finds widget at given coordinates', () => {
    const scene = new TuiScene();
    const widget = createWidget({x: 0, y: 0, width: 10, height: 5});
    scene.mount(widget);
    // MouseEvent uses 1-based SGR coordinates, hitTest converts to 0-based
    const result = scene.hitTest(mouseEvent(5, 3)); // 1-based → 0-based (4, 2)
    expect(result).toBe(widget);
  });

  it('returns undefined when no widget at coordinates', () => {
    const scene = new TuiScene();
    const widget = createWidget({x: 0, y: 0, width: 10, height: 5});
    scene.mount(widget);
    const result = scene.hitTest(mouseEvent(20, 20));
    expect(result).toBeUndefined();
  });

  it('finds topmost widget (highest zIndex) when overlapping', () => {
    const scene = new TuiScene();
    const bottom = createWidget({x: 0, y: 0, width: 10, height: 5, zIndex: 0});
    const top = createWidget({x: 0, y: 0, width: 10, height: 5, zIndex: 1});
    scene.mount(bottom);
    scene.mount(top);
    const result = scene.hitTest(mouseEvent(5, 3));
    expect(result).toBe(top);
  });

  it('skips invisible widgets', () => {
    const scene = new TuiScene();
    const widget = createWidget({x: 0, y: 0, width: 10, height: 5});
    widget.setVisible(false);
    scene.mount(widget);
    const result = scene.hitTest(mouseEvent(5, 3));
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty scene', () => {
    const scene = new TuiScene();
    const result = scene.hitTest(mouseEvent(5, 5));
    expect(result).toBeUndefined();
  });
});

describe('clearWidgets', () => {
  it('unmounts all widgets', () => {
    const scene = new TuiScene();
    const w1 = createWidget();
    const w2 = createWidget();
    scene.mount(w1);
    scene.mount(w2);
    scene.clearWidgets();
    expect(w1.refrenceCount).toBe(0);
    expect(w2.refrenceCount).toBe(0);
  });

  it('scene has no widgets after clear', () => {
    const scene = new TuiScene();
    scene.mount(createWidget());
    scene.clearWidgets();
    expect(scene.hitTest(mouseEvent(1, 1))).toBeUndefined();
  });
});

describe('destroy', () => {
  it('unmounts all widgets', () => {
    const scene = new TuiScene();
    const w1 = createWidget();
    const w2 = createWidget();
    scene.mount(w1);
    scene.mount(w2);
    scene.destroy();
    expect(w1.refrenceCount).toBe(0);
    expect(w2.refrenceCount).toBe(0);
  });
});
