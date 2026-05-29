import {it, expect, describe} from 'bun:test';
import {TuiScene} from '../TuiScene';
import type {DrawListBuffer} from '../../../draw_list/DrawListBuffer';
import type {MouseEvent} from '../../../events/types';
import {TuiWidgetEntity} from '../../../widgets/TuiWidgetEntity';

class StubWidget extends TuiWidgetEntity {
  _zIndex = 0;
  emitCommandsCalled = false;
  override emitDrawCommands(_buf: DrawListBuffer): void {
    this.emitCommandsCalled = true;
  }
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

class StubContainer extends StubWidget {
  override emitDrawCommands(buf: DrawListBuffer): void {
    this.emitCommandsCalled = true;
    this.renderChildren(buf);
  }
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
    expect(widget.referenceCount).toBe(1);
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
    expect(widget.referenceCount).toBe(0);
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
    expect(widget.referenceCount).toBe(-1);
  });
});

describe('hitTest', () => {
  it('finds widget at given coordinates', () => {
    const scene = new TuiScene();
    const widget = createWidget({x: 0, y: 0, width: 10, height: 5});
    scene.mount(widget);
    const result = scene.hitTest(mouseEvent(4, 2));
    expect(result).toBe(widget);
  });

  it('returns undefined when no widget at coordinates', () => {
    const scene = new TuiScene();
    const widget = createWidget({x: 0, y: 0, width: 10, height: 5});
    scene.mount(widget);
    const result = scene.hitTest(mouseEvent(19, 19));
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

  it('finds portal widget outside parent bounds', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    container._rect = {x: 0, y: 0, width: 10, height: 5};
    scene.mount(container);

    const portalChild = new StubWidget();
    portalChild._rect = {x: 0, y: 5, width: 10, height: 5};
    portalChild._zIndex = 10;
    portalChild.setPortal(true);
    container.addChild(portalChild);

    expect(scene.hitTest(mouseEvent(5, 7))).toBe(portalChild);
  });

  it('portal widget with higher zIndex wins hitTest over parent siblings', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    container._rect = {x: 0, y: 0, width: 10, height: 5};
    scene.mount(container);

    const sibling = createWidget({x: 0, y: 0, width: 10, height: 10, zIndex: 5});
    scene.mount(sibling);

    const portalChild = new StubWidget();
    portalChild._rect = {x: 0, y: 0, width: 10, height: 10};
    portalChild._zIndex = 10;
    portalChild.setPortal(true);
    container.addChild(portalChild);

    expect(scene.hitTest(mouseEvent(5, 7))).toBe(portalChild);
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
    expect(w1.referenceCount).toBe(0);
    expect(w2.referenceCount).toBe(0);
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
    expect(w1.referenceCount).toBe(0);
    expect(w2.referenceCount).toBe(0);
  });

  it('clears tick handlers', () => {
    const scene = new TuiScene();
    let called = false;
    scene.onTick(() => { called = true; });
    scene.destroy();
    scene.update(16);
    expect(called).toBe(false);
  });
});

describe('onTick / offTick', () => {
  it('onTick registers handler called on update', () => {
    const scene = new TuiScene();
    const received: number[] = [];
    scene.onTick(dt => received.push(dt));
    scene.update(16);
    expect(received).toEqual([16]);
  });

  it('onTick supports multiple handlers', () => {
    const scene = new TuiScene();
    let count = 0;
    scene.onTick(() => { count++; });
    scene.onTick(() => { count++; });
    scene.update(16);
    expect(count).toBe(2);
  });

  it('onTick returns unsubscribe function', () => {
    const scene = new TuiScene();
    let count = 0;
    const unsub = scene.onTick(() => { count++; });
    scene.update(16);
    expect(count).toBe(1);
    unsub();
    scene.update(16);
    expect(count).toBe(1);
  });

  it('onTick unsubscribe is idempotent', () => {
    const scene = new TuiScene();
    let count = 0;
    const unsub = scene.onTick(() => { count++; });
    unsub();
    unsub();
    scene.update(16);
    expect(count).toBe(0);
  });

  it('offTick removes handler', () => {
    const scene = new TuiScene();
    let count = 0;
    const handler = () => { count++; };
    scene.onTick(handler);
    scene.offTick(handler);
    scene.update(16);
    expect(count).toBe(0);
  });

  it('offTick with non-registered handler does nothing', () => {
    const scene = new TuiScene();
    scene.offTick(() => {});
  });

  it('clearWidgets clears tick handlers', () => {
    const scene = new TuiScene();
    let called = false;
    scene.onTick(() => { called = true; });
    scene.clearWidgets();
    scene.update(16);
    expect(called).toBe(false);
  });
});

describe('update', () => {
  it('calls update on visible widgets', () => {
    const scene = new TuiScene();
    const received: number[] = [];
    const widget = createWidget();
    widget.update = (dt: number) => { received.push(dt); };
    scene.mount(widget);
    scene.update(33);
    expect(received).toEqual([33]);
  });

  it('skips invisible widgets', () => {
    const scene = new TuiScene();
    let called = false;
    const widget = createWidget();
    widget.setVisible(false);
    widget.update = () => { called = true; };
    scene.mount(widget);
    scene.update(16);
    expect(called).toBe(false);
  });

  it('tick handlers run before widget updates', () => {
    const scene = new TuiScene();
    const order: string[] = [];
    scene.onTick(() => { order.push('tick'); });
    const widget = createWidget();
    widget.update = () => { order.push('widget'); };
    scene.mount(widget);
    scene.update(16);
    expect(order).toEqual(['tick', 'widget']);
  });
});

describe('portal rendering', () => {
  it('portal child is hoisted to scene level rendering', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    const portalChild = new StubWidget();
    portalChild.setPortal(true);
    container.addChild(portalChild);
    scene.mount(container);

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);

    expect(portalChild.emitCommandsCalled).toBe(true);
  });

  it('non-portal child renders normally via parent renderChildren', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    const normalChild = new StubWidget();
    container.addChild(normalChild);
    scene.mount(container);

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);

    expect(normalChild.emitCommandsCalled).toBe(true);
  });

  it('portal child is not rendered inline by parent renderChildren', () => {
    const container = new StubContainer();
    const portalChild = new StubWidget();
    portalChild.setPortal(true);
    container.addChild(portalChild);

    const buf = {} as DrawListBuffer;
    container.emitDrawCommands(buf);

    expect(portalChild.emitCommandsCalled).toBe(false);
  });

  it('portal toggle reverts to inline rendering', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    const child = new StubWidget();
    child.setPortal(true);
    container.addChild(child);
    scene.mount(container);

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);
    expect(child.emitCommandsCalled).toBe(true);

    child.emitCommandsCalled = false;
    child.setPortal(false);
    scene.emitDrawCommands(buf);
    expect(child.emitCommandsCalled).toBe(true);
  });

  it('portal widget renders with zIndex sort order', () => {
    const scene = new TuiScene();
    const background = new StubWidget();
    background._zIndex = 0;
    const portalWidget = new StubWidget();
    portalWidget.setPortal(true);
    portalWidget._zIndex = 10;
    const container = new StubContainer();
    container.addChild(portalWidget);
    scene.mount(background);
    scene.mount(container);

    const emitOrder: number[] = [];
    background.emitDrawCommands = () => { emitOrder.push(background._zIndex); };
    portalWidget.emitDrawCommands = () => { emitOrder.push(portalWidget._zIndex); };

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);

    expect(emitOrder).toEqual([0, 10]);
  });

  it('nested portals are both hoisted', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    const innerPortal = new StubWidget();
    innerPortal.setPortal(true);
    const outerPortal = new StubContainer();
    outerPortal.setPortal(true);
    outerPortal.addChild(innerPortal);
    container.addChild(outerPortal);
    scene.mount(container);

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);

    expect(outerPortal.emitCommandsCalled).toBe(true);
    expect(innerPortal.emitCommandsCalled).toBe(true);
  });

  it('invisible portal widget is not collected', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    const portalChild = new StubWidget();
    portalChild.setPortal(true);
    portalChild.setVisible(false);
    container.addChild(portalChild);
    scene.mount(container);

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);

    expect(portalChild.emitCommandsCalled).toBe(false);
  });

  it('deeply nested portal is collected', () => {
    const scene = new TuiScene();
    const root = new StubContainer();
    const mid = new StubContainer();
    const deepPortal = new StubWidget();
    deepPortal.setPortal(true);
    mid.addChild(deepPortal);
    root.addChild(mid);
    scene.mount(root);

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);

    expect(deepPortal.emitCommandsCalled).toBe(true);
  });

  it('portal widget remains in parent-child tree for event bubbling', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    const portalChild = new StubWidget();
    portalChild.setPortal(true);
    container.addChild(portalChild);
    scene.mount(container);

    let parentReceived = false;
    container.on('click', () => { parentReceived = true; });
    portalChild.dispatch('click', undefined);
    expect(parentReceived).toBe(true);
  });

  it('unmounted portal is not collected', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    const portalChild = new StubWidget();
    portalChild.setPortal(true);
    container.addChild(portalChild);
    container.removeChild(portalChild);
    scene.mount(container);

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);

    expect(portalChild.emitCommandsCalled).toBe(false);
  });

  it('portal child of invisible scene-level widget is not rendered', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    container.setVisible(false);
    const portalChild = new StubWidget();
    portalChild.setPortal(true);
    container.addChild(portalChild);
    scene.mount(container);

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);

    expect(portalChild.emitCommandsCalled).toBe(false);
  });

  it('portal child of invisible intermediate widget is not rendered', () => {
    const scene = new TuiScene();
    const root = new StubContainer();
    const mid = new StubContainer();
    mid.setVisible(false);
    const portalChild = new StubWidget();
    portalChild.setPortal(true);
    mid.addChild(portalChild);
    root.addChild(mid);
    scene.mount(root);

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);

    expect(portalChild.emitCommandsCalled).toBe(false);
  });

  it('showing parent makes portal child render again', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    container.setVisible(false);
    const portalChild = new StubWidget();
    portalChild.setPortal(true);
    container.addChild(portalChild);
    scene.mount(container);

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);
    expect(portalChild.emitCommandsCalled).toBe(false);

    container.setVisible(true);
    portalChild.emitCommandsCalled = false;
    scene.emitDrawCommands(buf);
    expect(portalChild.emitCommandsCalled).toBe(true);
  });

  it('v-show: invisible parent keeps portal child in tree with lifecycle intact', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    const portalChild = new StubWidget();
    portalChild.setPortal(true);
    container.addChild(portalChild);
    scene.mount(container);

    expect(portalChild.referenceCount).toBe(1);
    expect(container.children).toContain(portalChild);
    expect(portalChild.parent).toBe(container);

    container.setVisible(false);

    expect(portalChild.referenceCount).toBe(1);
    expect(container.children).toContain(portalChild);
    expect(portalChild.parent).toBe(container);

    let parentReceived = false;
    container.on('click', () => { parentReceived = true; });
    portalChild.dispatch('click', undefined);
    expect(parentReceived).toBe(true);
  });

  it('v-if: removeChild detaches portal child and it is not collected', () => {
    const scene = new TuiScene();
    const container = new StubContainer();
    const portalChild = new StubWidget();
    portalChild.setPortal(true);
    container.addChild(portalChild);
    scene.mount(container);

    expect(portalChild.referenceCount).toBe(1);
    container.removeChild(portalChild);
    expect(portalChild.referenceCount).toBe(0);
    expect(container.children).not.toContain(portalChild);
    expect(portalChild.parent).toBeNull();

    const buf = {
      setBackground: () => {},
      setSynchronizedUpdate: () => {},
      hideCursor: () => {},
    } as unknown as DrawListBuffer;
    scene.emitDrawCommands(buf);
    expect(portalChild.emitCommandsCalled).toBe(false);
  });
});
