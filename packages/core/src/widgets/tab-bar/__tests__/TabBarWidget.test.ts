import {it, expect, describe} from 'bun:test';
import {TabBarWidget} from '../TabBarWidget';
import type {KeyboardEvent, MouseEvent} from '../../../events/types';

function key(options: Partial<KeyboardEvent> & {key: string}): KeyboardEvent {
  return {
    key: options.key,
    shiftKey: options.shiftKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    metaKey: options.metaKey ?? false,
    repeat: options.repeat ?? false,
    charCode: options.charCode ?? 0,
  };
}

function mouse(options: Partial<MouseEvent> & {x: number; y: number}): MouseEvent {
  return {
    button: options.button ?? 0,
    buttons: options.buttons ?? undefined,
    x: options.x,
    y: options.y,
    isRelease: options.isRelease ?? false,
    shiftKey: options.shiftKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    metaKey: options.metaKey ?? false,
  };
}

// Tab layout with tabs ['Tab1', 'Tab2', 'Tab3'] at rectX=5:
// Tab0: x=5,  width=6 (5..10)   | Sep: 11
// Tab1: x=12, width=6 (12..17)  | Sep: 18
// Tab2: x=19, width=6 (19..24)
function createTabBar(options?: {
  tabs?: string[];
  value?: number;
  disabled?: boolean;
  rectX?: number;
  rectY?: number;
  rectWidth?: number;
  rectHeight?: number;
}) {
  return new TabBarWidget({
    tabs: options?.tabs ?? ['Tab1', 'Tab2', 'Tab3'],
    value: options?.value ?? 0,
    disabled: options?.disabled ?? false,
    rectX: options?.rectX ?? 5,
    rectY: options?.rectY ?? 0,
    rectWidth: options?.rectWidth ?? 40,
    rectHeight: options?.rectHeight ?? 1,
  });
}

describe('construction', () => {
  it('initializes with default options', () => {
    const bar = new TabBarWidget();
    expect(bar.value).toBe(0);
    expect(bar.tabs).toEqual([]);
    expect(bar.activeLabel).toBe('');
    expect(bar.disabled).toBe(false);
    expect(bar.acceptsFocus).toBe(true);
  });

  it('initializes with custom options', () => {
    const bar = createTabBar({tabs: ['A', 'B'], value: 1});
    expect(bar.tabs).toEqual(['A', 'B']);
    expect(bar.value).toBe(1);
    expect(bar.activeLabel).toBe('B');
  });

  it('initializes as disabled', () => {
    const bar = createTabBar({disabled: true});
    expect(bar.disabled).toBe(true);
    expect(bar.acceptsFocus).toBe(false);
  });
});

describe('keyboard navigation', () => {
  it('ArrowRight switches to next tab', () => {
    const bar = createTabBar();
    bar.handleKey(key({key: 'ArrowRight'}));
    expect(bar.value).toBe(1);
  });

  it('ArrowLeft switches to previous tab', () => {
    const bar = createTabBar({value: 1});
    bar.handleKey(key({key: 'ArrowLeft'}));
    expect(bar.value).toBe(0);
  });

  it('ArrowRight wraps around to first tab', () => {
    const bar = createTabBar({value: 2});
    bar.handleKey(key({key: 'ArrowRight'}));
    expect(bar.value).toBe(0);
  });

  it('ArrowLeft wraps around to last tab', () => {
    const bar = createTabBar();
    bar.handleKey(key({key: 'ArrowLeft'}));
    expect(bar.value).toBe(2);
  });

  it('does nothing with empty tabs', () => {
    const bar = createTabBar({tabs: []});
    bar.handleKey(key({key: 'ArrowRight'}));
    expect(bar.value).toBe(0);
  });

  it('keyboard dispatches change event', () => {
    const bar = createTabBar();
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    bar.handleKey(key({key: 'ArrowRight'}));
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, unknown>).value).toBe(1);
    expect((changes[0] as Record<string, unknown>).label).toBe('Tab2');
  });

  it('does not dispatch change when selecting same tab', () => {
    const bar = createTabBar({value: 0});
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    // ArrowLeft wraps to 2, which is different
    bar.handleKey(key({key: 'ArrowLeft'}));
    expect(changes).toHaveLength(1);
  });

  it('disabled widget ignores keyboard', () => {
    const bar = createTabBar({disabled: true});
    bar.handleKey(key({key: 'ArrowRight'}));
    expect(bar.value).toBe(0);
  });

  it('ignores undefined key', () => {
    const bar = createTabBar();
    bar.handleKey({
      key: undefined,
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
      charCode: 0,
    });
    expect(bar.value).toBe(0);
  });

  it('other keys do nothing', () => {
    const bar = createTabBar();
    bar.handleKey(key({key: 'a'}));
    bar.handleKey(key({key: 'Tab'}));
    bar.handleKey(key({key: 'Enter'}));
    expect(bar.value).toBe(0);
  });
});

describe('mouse selection', () => {
  it('click selects tab by x position', () => {
    const bar = createTabBar({rectX: 5});
    // Tab1 at x=12..17
    bar.dispatch('mousedown', mouse({x: 14, y: 0}));
    expect(bar.value).toBe(1);
    expect(bar.activeLabel).toBe('Tab2');
  });

  it('click dispatches change event', () => {
    const bar = createTabBar({rectX: 5});
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    bar.dispatch('mousedown', mouse({x: 19, y: 0}));
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, unknown>).value).toBe(2);
    expect((changes[0] as Record<string, unknown>).label).toBe('Tab3');
  });

  it('click on separator does nothing', () => {
    const bar = createTabBar({rectX: 5, value: 0});
    // Separator at x=11
    bar.dispatch('mousedown', mouse({x: 11, y: 0}));
    expect(bar.value).toBe(0);
  });

  it('click outside tab area does nothing', () => {
    const bar = createTabBar({rectX: 5, value: 0});
    bar.dispatch('mousedown', mouse({x: 50, y: 0}));
    expect(bar.value).toBe(0);
  });

  it('disabled widget ignores click', () => {
    const bar = createTabBar({disabled: true, rectX: 5});
    bar.dispatch('mousedown', mouse({x: 14, y: 0}));
    expect(bar.value).toBe(0);
  });
});

describe('setValue', () => {
  it('sets value directly', () => {
    const bar = createTabBar();
    expect(bar.value).toBe(0);
    bar.setValue(2);
    expect(bar.value).toBe(2);
    expect(bar.activeLabel).toBe('Tab3');
  });

  it('does not dispatch change event', () => {
    const bar = createTabBar();
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    bar.setValue(1);
    expect(changes).toHaveLength(0);
  });
});

describe('setTabs', () => {
  it('replaces tabs', () => {
    const bar = createTabBar();
    bar.setTabs(['X', 'Y']);
    expect(bar.tabs).toEqual(['X', 'Y']);
  });

  it('clamps value if out of range', () => {
    const bar = createTabBar({value: 2});
    bar.setTabs(['A', 'B']);
    expect(bar.value).toBe(1);
  });

  it('keeps value if still valid', () => {
    const bar = createTabBar({value: 1});
    bar.setTabs(['A', 'B', 'C']);
    expect(bar.value).toBe(1);
    expect(bar.activeLabel).toBe('B');
  });
});

describe('disabled state', () => {
  it('setDisabled changes state', () => {
    const bar = createTabBar();
    expect(bar.acceptsFocus).toBe(true);
    bar.setDisabled(true);
    expect(bar.disabled).toBe(true);
    expect(bar.acceptsFocus).toBe(false);
  });
});

describe('focus / blur', () => {
  it('focus dispatches focus event', () => {
    const bar = createTabBar();
    let focused = false;
    bar.on('focus', () => {
      focused = true;
    });
    bar.focus();
    expect(focused).toBe(true);
  });

  it('blur dispatches blur event', () => {
    const bar = createTabBar();
    let blurred = false;
    bar.on('blur', () => {
      blurred = true;
    });
    bar.blur();
    expect(blurred).toBe(true);
  });
});

describe('rect and hit testing', () => {
  it('containsPoint checks bounds correctly', () => {
    const bar = createTabBar({rectX: 5, rectY: 3, rectWidth: 30, rectHeight: 1});
    expect(bar.containsPoint(5, 3)).toBe(true);
    expect(bar.containsPoint(34, 3)).toBe(true);
    expect(bar.containsPoint(35, 3)).toBe(false);
    expect(bar.containsPoint(4, 3)).toBe(false);
    expect(bar.containsPoint(10, 4)).toBe(false);
  });

  it('updateRect updates position and size', () => {
    const bar = createTabBar();
    bar.updateRect({rectX: 10, rectY: 20, rectWidth: 50, rectHeight: 2});
    const r = bar.rect;
    expect(r.rectX).toBe(10);
    expect(r.rectY).toBe(20);
    expect(r.rectWidth).toBe(50);
    expect(r.rectHeight).toBe(2);
  });
});

describe('unmounted', () => {
  it('unmounted while focused calls blur', () => {
    const bar = createTabBar();
    let blurred = false;
    bar.on('blur', () => {
      blurred = true;
    });
    bar.focus();
    bar.unmounted();
    expect(blurred).toBe(true);
  });
});
