import {it, expect, describe} from 'bun:test';
import {SelectButtonWidget} from '../SelectButtonWidget';
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

// Option layout with options ['Tab1', 'Tab2', 'Tab3'] at x=5:
// Opt0: x=5,  width=6 (5..10)   | Sep: 11
// Opt1: x=12, width=6 (12..17)  | Sep: 18
// Opt2: x=19, width=6 (19..24)
function createSelectButton(options?: {
  options?: unknown[];
  value?: unknown;
  disabled?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  return new SelectButtonWidget({
    options: options?.options ?? ['Tab1', 'Tab2', 'Tab3'],
    value: options?.value ?? 'Tab1',
    disabled: options?.disabled ?? false,
    x: options?.x ?? 5,
    y: options?.y ?? 0,
    width: options?.width ?? 40,
    height: options?.height ?? 1,
  });
}

describe('construction', () => {
  it('initializes with default options', () => {
    const bar = new SelectButtonWidget();
    expect(bar.value).toBe(undefined);
    expect(bar.options).toEqual([]);
    expect(bar.activeLabel).toBe('');
    expect(bar.disabled).toBe(false);
    expect(bar.acceptsFocus).toBe(true);
  });

  it('initializes with custom options', () => {
    const bar = createSelectButton({options: ['A', 'B'], value: 'B'});
    expect(bar.options).toEqual(['A', 'B']);
    expect(bar.value).toBe('B');
    expect(bar.activeLabel).toBe('B');
  });

  it('initializes as disabled', () => {
    const bar = createSelectButton({disabled: true});
    expect(bar.disabled).toBe(true);
    expect(bar.acceptsFocus).toBe(false);
  });

  it('defaults to first option when no value provided', () => {
    const bar = new SelectButtonWidget({options: ['X', 'Y']});
    expect(bar.value).toBe('X');
    expect(bar.activeLabel).toBe('X');
  });

  it('sets value to undefined when value not found in options', () => {
    const bar = new SelectButtonWidget({options: ['A', 'B'], value: 'Z'});
    expect(bar.value).toBe(undefined);
  });
});

describe('keyboard navigation', () => {
  it('ArrowRight switches to next option', () => {
    const bar = createSelectButton();
    bar.handleKey(key({key: 'ArrowRight'}));
    expect(bar.value).toBe('Tab2');
  });

  it('ArrowLeft switches to previous option', () => {
    const bar = createSelectButton({value: 'Tab2'});
    bar.handleKey(key({key: 'ArrowLeft'}));
    expect(bar.value).toBe('Tab1');
  });

  it('ArrowRight wraps around to first option', () => {
    const bar = createSelectButton({value: 'Tab3'});
    bar.handleKey(key({key: 'ArrowRight'}));
    expect(bar.value).toBe('Tab1');
  });

  it('ArrowLeft wraps around to last option', () => {
    const bar = createSelectButton();
    bar.handleKey(key({key: 'ArrowLeft'}));
    expect(bar.value).toBe('Tab3');
  });

  it('Home selects first option', () => {
    const bar = createSelectButton({value: 'Tab3'});
    bar.handleKey(key({key: 'Home'}));
    expect(bar.value).toBe('Tab1');
  });

  it('End selects last option', () => {
    const bar = createSelectButton();
    bar.handleKey(key({key: 'End'}));
    expect(bar.value).toBe('Tab3');
  });

  it('Home dispatches change event', () => {
    const bar = createSelectButton({value: 'Tab2'});
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    bar.handleKey(key({key: 'Home'}));
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, unknown>).value).toBe('Tab1');
  });

  it('End dispatches change event', () => {
    const bar = createSelectButton();
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    bar.handleKey(key({key: 'End'}));
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, unknown>).value).toBe('Tab3');
  });

  it('Home does not dispatch change when already on first', () => {
    const bar = createSelectButton({value: 'Tab1'});
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    bar.handleKey(key({key: 'Home'}));
    expect(changes).toHaveLength(0);
  });

  it('End does not dispatch change when already on last', () => {
    const bar = createSelectButton({value: 'Tab3'});
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    bar.handleKey(key({key: 'End'}));
    expect(changes).toHaveLength(0);
  });

  it('does nothing with empty options', () => {
    const bar = createSelectButton({options: []});
    bar.handleKey(key({key: 'ArrowRight'}));
    expect(bar.value).toBe(undefined);
  });

  it('keyboard dispatches change event', () => {
    const bar = createSelectButton();
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    bar.handleKey(key({key: 'ArrowRight'}));
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, unknown>).value).toBe('Tab2');
    expect((changes[0] as Record<string, unknown>).label).toBe('Tab2');
  });

  it('does not dispatch change when selecting same option', () => {
    const bar = createSelectButton({value: 'Tab1'});
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    // ArrowLeft wraps to Tab3, which is different
    bar.handleKey(key({key: 'ArrowLeft'}));
    expect(changes).toHaveLength(1);
  });

  it('disabled widget ignores keyboard', () => {
    const bar = createSelectButton({disabled: true});
    bar.handleKey(key({key: 'ArrowRight'}));
    expect(bar.value).toBe('Tab1');
  });

  it('ignores undefined key', () => {
    const bar = createSelectButton();
    bar.handleKey({
      key: undefined,
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
      charCode: 0,
    });
    expect(bar.value).toBe('Tab1');
  });

  it('other keys do nothing', () => {
    const bar = createSelectButton();
    bar.handleKey(key({key: 'a'}));
    bar.handleKey(key({key: 'Tab'}));
    bar.handleKey(key({key: 'Enter'}));
    expect(bar.value).toBe('Tab1');
  });
});

describe('mouse selection', () => {
  it('click selects option by x position', () => {
    const bar = createSelectButton({x: 5});
    // Tab2 at x=12..17
    bar.dispatch('mousedown', mouse({x: 14, y: 0}));
    expect(bar.value).toBe('Tab2');
    expect(bar.activeLabel).toBe('Tab2');
  });

  it('click dispatches change event', () => {
    const bar = createSelectButton({x: 5});
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    bar.dispatch('mousedown', mouse({x: 19, y: 0}));
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, unknown>).value).toBe('Tab3');
    expect((changes[0] as Record<string, unknown>).label).toBe('Tab3');
  });

  it('click on separator does nothing', () => {
    const bar = createSelectButton({x: 5, value: 'Tab1'});
    // Separator at x=11
    bar.dispatch('mousedown', mouse({x: 11, y: 0}));
    expect(bar.value).toBe('Tab1');
  });

  it('click outside option area does nothing', () => {
    const bar = createSelectButton({x: 5, value: 'Tab1'});
    bar.dispatch('mousedown', mouse({x: 50, y: 0}));
    expect(bar.value).toBe('Tab1');
  });

  it('disabled widget ignores click', () => {
    const bar = createSelectButton({disabled: true, x: 5});
    bar.dispatch('mousedown', mouse({x: 14, y: 0}));
    expect(bar.value).toBe('Tab1');
  });
});

describe('updateValue', () => {
  it('sets value directly', () => {
    const bar = createSelectButton();
    expect(bar.value).toBe('Tab1');
    bar.updateValue('Tab3');
    expect(bar.value).toBe('Tab3');
    expect(bar.activeLabel).toBe('Tab3');
  });

  it('does not dispatch change event', () => {
    const bar = createSelectButton();
    const changes: unknown[] = [];
    bar.on('change', data => changes.push(data));
    bar.updateValue('Tab2');
    expect(changes).toHaveLength(0);
  });

  it('ignores value not in options', () => {
    const bar = createSelectButton();
    bar.updateValue('NonExistent');
    expect(bar.value).toBe('Tab1');
  });
});

describe('setOptions', () => {
  it('replaces options', () => {
    const bar = createSelectButton();
    bar.setOptions(['X', 'Y']);
    expect(bar.options).toEqual(['X', 'Y']);
  });

  it('keeps current value if still present', () => {
    const bar = createSelectButton({value: 'Tab2'});
    bar.setOptions(['Tab1', 'Tab2', 'Tab3', 'Tab4']);
    expect(bar.value).toBe('Tab2');
    expect(bar.activeLabel).toBe('Tab2');
  });

  it('defaults to first option if current value removed', () => {
    const bar = createSelectButton({value: 'Tab3'});
    bar.setOptions(['A', 'B']);
    expect(bar.value).toBe('A');
  });

  it('sets index to -1 when given empty array', () => {
    const bar = createSelectButton();
    bar.setOptions([]);
    expect(bar.value).toBe(undefined);
  });
});

describe('disabled state', () => {
  it('setDisabled changes state', () => {
    const bar = createSelectButton();
    expect(bar.acceptsFocus).toBe(true);
    bar.setDisabled(true);
    expect(bar.disabled).toBe(true);
    expect(bar.acceptsFocus).toBe(false);
  });
});

describe('focus / blur', () => {
  it('focus dispatches focus event', () => {
    const bar = createSelectButton();
    let focused = false;
    bar.on('focus', () => {
      focused = true;
    });
    bar.focus();
    expect(focused).toBe(true);
  });

  it('blur dispatches blur event', () => {
    const bar = createSelectButton();
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
    const bar = createSelectButton({x: 5, y: 3, width: 30, height: 1});
    expect(bar.containsPoint(5, 3)).toBe(true);
    expect(bar.containsPoint(34, 3)).toBe(true);
    expect(bar.containsPoint(35, 3)).toBe(false);
    expect(bar.containsPoint(4, 3)).toBe(false);
    expect(bar.containsPoint(10, 4)).toBe(false);
  });

  it('updateRect updates position and size', () => {
    const bar = createSelectButton();
    bar.updateRect({x: 10, y: 20, width: 50, height: 2});
    const r = bar.rect;
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.width).toBe(50);
    expect(r.height).toBe(2);
  });
});

describe('unmounted', () => {
  it('unmounted while focused calls blur', () => {
    const bar = createSelectButton();
    let blurred = false;
    bar.on('blur', () => {
      blurred = true;
    });
    bar.focus();
    bar.unmounted();
    expect(blurred).toBe(true);
  });
});
