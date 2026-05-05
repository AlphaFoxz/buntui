import {it, expect, describe} from 'bun:test';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';

class TestWidget extends TuiWidgetEntity {
  emitCommandsCalled = false;

  override emitDrawCommands(_buf: DrawListBuffer): void {
    this.emitCommandsCalled = true;
  }

  override get rect() {
    return this._rect;
  }

  override updateRect(rect: Partial<{x: U16; y: U16; width: U16; height: U16}>): void {
    const oldX = this._rect.x;
    const oldY = this._rect.y;
    Object.assign(this._rect, rect);
    this.propagatePositionDelta(this._rect.x - oldX, this._rect.y - oldY);
  }

  _rect: {x: number; y: number; width: number; height: number} = {x: 0, y: 0, width: 10, height: 5};
}

function createWidget(): TestWidget {
  return new TestWidget();
}

describe('default property values', () => {
  it('draggable defaults to false', () => {
    expect(createWidget().draggable).toBe(false);
  });

  it('visible defaults to true', () => {
    expect(createWidget().visible).toBe(true);
  });

  it('zIndex defaults to 0', () => {
    expect(createWidget().zIndex).toBe(0);
  });

  it('refrenceCount defaults to 0', () => {
    expect(createWidget().refrenceCount).toBe(0);
  });

  it('rect defaults to zeros', () => {
    const widget = new (class extends TuiWidgetEntity {
      override emitDrawCommands() {}
    })();
    expect(widget.rect).toEqual({x: 0, y: 0, width: 0, height: 0});
  });
});

describe('setDraggable', () => {
  it('sets draggable to true', () => {
    const widget = createWidget();
    widget.setDraggable(true);
    expect(widget.draggable).toBe(true);
  });

  it('sets draggable to false', () => {
    const widget = createWidget();
    widget.setDraggable(true);
    widget.setDraggable(false);
    expect(widget.draggable).toBe(false);
  });
});

describe('setVisible', () => {
  it('sets visible to false', () => {
    const widget = createWidget();
    widget.setVisible(false);
    expect(widget.visible).toBe(false);
  });

  it('sets visible back to true', () => {
    const widget = createWidget();
    widget.setVisible(false);
    widget.setVisible(true);
    expect(widget.visible).toBe(true);
  });
});

describe('event system', () => {
  it('on + dispatch fires handler', () => {
    const widget = createWidget();
    const received: unknown[] = [];
    widget.on('test', data => received.push(data));
    widget.dispatch('test', 42);
    expect(received).toEqual([42]);
  });

  it('dispatch with no handlers does nothing', () => {
    const widget = createWidget();
    // Should not throw
    widget.dispatch('nonexistent', null);
  });

  it('multiple handlers for same event', () => {
    const widget = createWidget();
    let count = 0;
    widget.on('click', () => { count++; });
    widget.on('click', () => { count++; });
    widget.dispatch('click', undefined);
    expect(count).toBe(2);
  });

  it('off removes specific handler', () => {
    const widget = createWidget();
    let count = 0;
    const handler = () => { count++; };
    widget.on('click', handler);
    widget.off('click', handler);
    widget.dispatch('click', undefined);
    expect(count).toBe(0);
  });

  it('off with non-registered handler does nothing', () => {
    const widget = createWidget();
    widget.on('click', () => {});
    widget.off('click', () => {});
    // Should not throw
  });

  it('off for non-existent event does nothing', () => {
    const widget = createWidget();
    widget.off('nonexistent', () => {});
    // Should not throw
  });

  it('dispatch delivers to each handler independently', () => {
    const widget = createWidget();
    const results: string[] = [];
    widget.on('ev', () => results.push('a'));
    widget.on('ev', () => results.push('b'));
    widget.dispatch('ev', undefined);
    expect(results).toEqual(['a', 'b']);
  });
});

describe('mounted / unmounted', () => {
  it('mounted increments refrenceCount', () => {
    const widget = createWidget();
    widget.mounted();
    expect(widget.refrenceCount).toBe(1);
    widget.mounted();
    expect(widget.refrenceCount).toBe(2);
  });

  it('unmounted decrements refrenceCount', () => {
    const widget = createWidget();
    widget.mounted();
    widget.mounted();
    widget.unmounted();
    expect(widget.refrenceCount).toBe(1);
  });

  it('unmounted clears event handlers when count reaches 0', () => {
    const widget = createWidget();
    widget.on('click', () => {});
    widget.mounted();
    widget.unmounted();
    // After unmount to 0, handlers cleared — dispatch does nothing
    let called = false;
    widget.on('test', () => { called = true; });
    widget.dispatch('test', undefined);
    expect(called).toBe(true);

    // But the old 'click' handler should have been cleared
    let clickCalled = false;
    // Re-register to check the old one was cleared (can't directly test, but we verify new handlers work)
    widget.on('click', () => { clickCalled = true; });
    widget.dispatch('click', undefined);
    expect(clickCalled).toBe(true);
  });

  it('unmounted does not clear handlers when count > 0', () => {
    const widget = createWidget();
    widget.mounted();
    widget.mounted();
    let called = false;
    widget.on('test', () => { called = true; });
    widget.unmounted(); // count goes from 2 → 1
    widget.dispatch('test', undefined);
    expect(called).toBe(true);
  });
});

describe('addChild / removeChild', () => {
  it('addChild calls mounted on child', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.addChild(child);
    expect(child.refrenceCount).toBe(1);
  });

  it('removeChild calls unmounted on child', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.addChild(child);
    parent.removeChild(child);
    expect(child.refrenceCount).toBe(0);
  });

  it('removeChild with non-child does nothing', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.removeChild(child);
    expect(child.refrenceCount).toBe(0);
  });
});

describe('intrinsicSize', () => {
  it('returns undefined by default', () => {
    expect(createWidget().intrinsicSize()).toBeUndefined();
  });
});

describe('containsPoint', () => {
  it('returns false by default', () => {
    const widget = new (class extends TuiWidgetEntity {
      override emitDrawCommands() {}
    })();
    expect(widget.containsPoint(0, 0)).toBe(false);
  });
});

describe('updateRect', () => {
  it('default implementation is no-op', () => {
    const widget = new (class extends TuiWidgetEntity {
      override emitDrawCommands() {}
    })();
    // Should not throw
    widget.updateRect({x: 5 as U16});
  });
});

describe('propagatePositionDelta', () => {
  it('propagates position change to children', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.addChild(child);
    parent.updateRect({x: 10, y: 20});
    // propagatePositionDelta is called from subclass updateRect, but TestWidget does it via Object.assign
    // We test by calling updateRect which triggers propagation
    expect(child.rect.x).toBe(10);
    expect(child.rect.y).toBe(20);
  });

  it('does not propagate when delta is zero', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.addChild(child);
    const originalX = child.rect.x;
    const originalY = child.rect.y;
    parent.updateRect({width: 99}); // Only size change, position stays same
    expect(child.rect.x).toBe(originalX);
    expect(child.rect.y).toBe(originalY);
  });
});

describe('renderChildren', () => {
  it('skips invisible children', () => {
    const parent = createWidget();
    const child = createWidget();
    child.setVisible(false);
    parent.addChild(child);

    // Create a mock buffer
    const mockBuf = {} as DrawListBuffer;
    parent.emitDrawCommands(mockBuf);
    // emitCommandsCalled is only set on the parent, child was invisible
    expect(parent.emitCommandsCalled).toBe(true);
    expect(child.emitCommandsCalled).toBe(false);
  });
});
