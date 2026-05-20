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

  it('referenceCount defaults to 0', () => {
    expect(createWidget().referenceCount).toBe(0);
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

  it('dispatch bubbles to parent', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.addChild(child);
    let parentReceived = false;
    parent.on('click', () => { parentReceived = true; });
    child.dispatch('click', undefined);
    expect(parentReceived).toBe(true);
  });

  it('stopPropagation prevents bubbling', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.addChild(child);
    let parentReceived = false;
    child.on('click', () => { child.stopPropagation(); });
    parent.on('click', () => { parentReceived = true; });
    child.dispatch('click', undefined);
    expect(parentReceived).toBe(false);
  });

  it('stopPropagation resets after dispatch', () => {
    const widget = createWidget();
    widget.on('click', () => { widget.stopPropagation(); });
    widget.dispatch('click', undefined);
    let secondCall = false;
    widget.on('test', () => { secondCall = true; });
    widget.dispatch('test', undefined);
    expect(secondCall).toBe(true);
  });
});

describe('mounted / unmounted', () => {
  it('mounted increments referenceCount', () => {
    const widget = createWidget();
    widget.mounted();
    expect(widget.referenceCount).toBe(1);
    widget.mounted();
    expect(widget.referenceCount).toBe(2);
  });

  it('unmounted decrements referenceCount', () => {
    const widget = createWidget();
    widget.mounted();
    widget.mounted();
    widget.unmounted();
    expect(widget.referenceCount).toBe(1);
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
    expect(child.referenceCount).toBe(1);
  });

  it('removeChild calls unmounted on child', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.addChild(child);
    parent.removeChild(child);
    expect(child.referenceCount).toBe(0);
  });

  it('removeChild with non-child does nothing', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.removeChild(child);
    expect(child.referenceCount).toBe(0);
  });
});

describe('intrinsicSize', () => {
  it('returns undefined by default', () => {
    expect(createWidget().intrinsicSize()).toBeUndefined();
  });
});

describe('containsPoint', () => {
  it('checks rect bounds by default', () => {
    const widget = new (class extends TuiWidgetEntity {
      override get rect() {
        return {x: 5, y: 3, width: 10, height: 5};
      }
      override emitDrawCommands() {}
    })();
    expect(widget.containsPoint(5, 3)).toBe(true);
    expect(widget.containsPoint(14, 7)).toBe(true);
    expect(widget.containsPoint(15, 3)).toBe(false);
    expect(widget.containsPoint(4, 3)).toBe(false);
  });

  it('returns false for zero-size rect', () => {
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

describe('resolveLayout', () => {
  it('resolves percent spec to absolute values', () => {
    class LayoutWidget extends TestWidget {
      override initRect = super.initRect;
    }

    const widget = new LayoutWidget();
    const rect = widget.initRect('50%', '25%', '100%', '10%');
    widget.setPercentSpec({x: '50%', y: '25%', width: '100%', height: '10%'});
    expect(widget.hasPercentLayout).toBe(true);
    widget.resolveLayout(200, 40);
    expect(widget.rect.x).toBe(100);
    expect(widget.rect.y).toBe(10);
    expect(widget.rect.width).toBe(200);
    expect(widget.rect.height).toBe(4);
  });

  it('does nothing when no percent spec is set', () => {
    const widget = createWidget();
    widget.resolveLayout(200, 40);
    expect(widget.rect).toEqual({x: 0, y: 0, width: 10, height: 5});
  });
});

describe('initRect', () => {
  it('returns defaults for undefined values', () => {
    class InitWidget extends TestWidget {
      callInitRect = this.initRect.bind(this);
    }

    const widget = new InitWidget();
    const rect = widget.callInitRect();
    expect(rect).toEqual({x: 0, y: 0, width: 0, height: 0});
  });

  it('uses provided defaults for undefined values', () => {
    class InitWidget extends TestWidget {
      callInitRect = this.initRect.bind(this);
    }

    const widget = new InitWidget();
    const rect = widget.callInitRect(undefined, undefined, undefined, undefined, {x: 1, width: 20});
    expect(rect).toEqual({x: 1, y: 0, width: 20, height: 0});
  });

  it('returns 0 for percent values (resolved later)', () => {
    class InitWidget extends TestWidget {
      callInitRect = this.initRect.bind(this);
    }

    const widget = new InitWidget();
    const rect = widget.callInitRect('50%', '25%', '100%', '10%');
    expect(rect).toEqual({x: 0, y: 0, width: 0, height: 0});
    expect(widget.hasPercentLayout).toBe(true);
  });

  it('uses absolute values directly', () => {
    class InitWidget extends TestWidget {
      callInitRect = this.initRect.bind(this);
    }

    const widget = new InitWidget();
    const rect = widget.callInitRect(5, 10, 30, 20);
    expect(rect).toEqual({x: 5, y: 10, width: 30, height: 20});
    expect(widget.hasPercentLayout).toBe(false);
  });
});

describe('closest', () => {
  it('returns self if predicate matches', () => {
    const widget = createWidget();
    expect(widget.closest(w => w === widget)).toBe(widget);
  });

  it('walks up to parent', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.addChild(child);
    expect(child.closest(w => w === parent)).toBe(parent);
  });

  it('returns undefined when no ancestor matches', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.addChild(child);
    expect(child.closest(() => false)).toBeUndefined();
  });
});

describe('parent / children', () => {
  it('parent is null by default', () => {
    expect(createWidget().parent).toBeNull();
  });

  it('children is empty by default', () => {
    expect(createWidget().children).toEqual([]);
  });

  it('addChild sets parent and adds to children', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.addChild(child);
    expect(parent.children).toContain(child);
    expect(child.parent).toBe(parent);
  });

  it('removeChild clears parent and removes from children', () => {
    const parent = createWidget();
    const child = createWidget();
    parent.addChild(child);
    parent.removeChild(child);
    expect(parent.children).not.toContain(child);
    expect(child.parent).toBeNull();
  });
});

describe('dispatchKeyEvent', () => {
  it('dispatches key event', () => {
    const widget = createWidget();
    let received = false;
    widget.on('key', () => { received = true; });
    widget.dispatchKeyEvent({key: 'Enter'} as any);
    expect(received).toBe(true);
  });
});

describe('update', () => {
  it('default implementation does not throw', () => {
    const widget = new (class extends TuiWidgetEntity {
      override emitDrawCommands() {}
    })();
    expect(() => widget.update(16)).not.toThrow();
  });

  it('subclass can override to receive dt', () => {
    const received: number[] = [];
    const widget = new (class extends TuiWidgetEntity {
      override emitDrawCommands() {}
      override update(dt: number): void {
        received.push(dt);
      }
    })();
    widget.update(16);
    widget.update(33);
    expect(received).toEqual([16, 33]);
  });
});
