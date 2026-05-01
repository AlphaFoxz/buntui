import {it, expect, describe} from 'bun:test';
import {RadioGroupWidget} from '../RadioGroupWidget';
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

function createRadio(options?: {options?: string[]; value?: number; disabled?: boolean; rectX?: number; rectY?: number; rectWidth?: number; rectHeight?: number}) {
  return new RadioGroupWidget({
    options: options?.options ?? ['Red', 'Green', 'Blue'],
    value: options?.value ?? -1,
    disabled: options?.disabled ?? false,
    rectX: options?.rectX ?? 0,
    rectY: options?.rectY ?? 0,
    rectWidth: options?.rectWidth ?? 20,
    rectHeight: options?.rectHeight ?? 3,
  });
}

describe('construction', () => {
  it('initializes with default options', () => {
    const radio = new RadioGroupWidget();
    expect(radio.value).toBe(-1);
    expect(radio.selectedLabel).toBe('');
    expect(radio.options).toEqual([]);
    expect(radio.disabled).toBe(false);
    expect(radio.acceptsFocus).toBe(true);
  });

  it('initializes with custom options', () => {
    const radio = createRadio({options: ['A', 'B'], value: 0});
    expect(radio.options).toEqual(['A', 'B']);
    expect(radio.value).toBe(0);
    expect(radio.selectedLabel).toBe('A');
  });

  it('initializes as disabled', () => {
    const radio = createRadio({disabled: true});
    expect(radio.disabled).toBe(true);
    expect(radio.acceptsFocus).toBe(false);
  });
});

describe('keyboard navigation', () => {
  it('ArrowDown moves hovered index forward', () => {
    const radio = createRadio();
    // hoveredIndex starts at -1, first ArrowDown goes to 0
    radio.handleKey(key({key: 'ArrowDown'}));
    // Second ArrowDown moves to 1
    radio.handleKey(key({key: 'ArrowDown'}));
    radio.handleKey(key({key: 'Enter'}));
    expect(radio.value).toBe(1);
  });

  it('ArrowUp wraps around', () => {
    const radio = createRadio();
    // hoveredIndex starts at -1 (≤0), ArrowUp wraps to last (2)
    radio.handleKey(key({key: 'ArrowUp'}));
    radio.handleKey(key({key: 'Enter'}));
    expect(radio.value).toBe(2);
  });

  it('ArrowDown wraps around', () => {
    const radio = createRadio();
    // -1 → 0 → 1 → 2 → 0 (wraps after 4 presses)
    radio.handleKey(key({key: 'ArrowDown'})); // 0
    radio.handleKey(key({key: 'ArrowDown'})); // 1
    radio.handleKey(key({key: 'ArrowDown'})); // 2
    radio.handleKey(key({key: 'ArrowDown'})); // wraps back to 0
    radio.handleKey(key({key: 'Enter'}));
    expect(radio.value).toBe(0);
  });

  it('does nothing with empty options', () => {
    const radio = createRadio({options: []});
    radio.handleKey(key({key: 'ArrowDown'}));
    radio.handleKey(key({key: 'Enter'}));
    expect(radio.value).toBe(-1);
  });
});

describe('keyboard selection', () => {
  it('Enter does nothing when no item hovered', () => {
    const radio = createRadio();
    // hoveredIndex starts at -1, Enter should not select
    radio.handleKey(key({key: 'Enter'}));
    expect(radio.value).toBe(-1);
  });

  it('Space does nothing when no item hovered', () => {
    const radio = createRadio();
    radio.handleKey(key({key: ' '}));
    expect(radio.value).toBe(-1);
  });

  it('selection dispatches change event', () => {
    const radio = createRadio();
    const changes: unknown[] = [];
    radio.on('change', data => changes.push(data));
    // Navigate to first item, then select
    radio.handleKey(key({key: 'ArrowDown'})); // -1 → 0
    radio.handleKey(key({key: 'ArrowDown'})); // 0 → 1
    radio.handleKey(key({key: 'Enter'}));
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, unknown>).value).toBe(1);
    expect((changes[0] as Record<string, unknown>).label).toBe('Green');
  });

  it('other keys do nothing', () => {
    const radio = createRadio();
    radio.handleKey(key({key: 'a'}));
    radio.handleKey(key({key: 'Tab'}));
    expect(radio.value).toBe(-1);
  });

  it('ignores undefined key', () => {
    const radio = createRadio();
    radio.handleKey({key: undefined, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, charCode: 0});
    expect(radio.value).toBe(-1);
  });

  it('disabled widget ignores keyboard', () => {
    const radio = createRadio({disabled: true});
    radio.handleKey(key({key: 'ArrowDown'}));
    radio.handleKey(key({key: 'Enter'}));
    expect(radio.value).toBe(-1);
  });
});

describe('mouse selection', () => {
  it('click selects item by y position', () => {
    const radio = createRadio({rectX: 5, rectY: 5, rectHeight: 3});
    // Click on second option: y=7 → innerY = (7-1) - 5 = 1
    radio.dispatch('mousedown', mouse({x: 7, y: 7}));
    expect(radio.value).toBe(1);
    expect(radio.selectedLabel).toBe('Green');
  });

  it('click dispatches change event', () => {
    const radio = createRadio({rectX: 5, rectY: 5, rectHeight: 3});
    const changes: unknown[] = [];
    radio.on('change', data => changes.push(data));
    radio.dispatch('mousedown', mouse({x: 7, y: 6}));
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, unknown>).value).toBe(0);
    expect((changes[0] as Record<string, unknown>).label).toBe('Red');
  });

  it('click outside option range does nothing', () => {
    const radio = createRadio({rectX: 5, rectY: 5, rectHeight: 5});
    radio.dispatch('mousedown', mouse({x: 7, y: 9})); // innerY=3, only 3 options (0-2)
    expect(radio.value).toBe(-1);
  });

  it('disabled widget ignores click', () => {
    const radio = createRadio({disabled: true, rectX: 5, rectY: 5});
    radio.dispatch('mousedown', mouse({x: 7, y: 6}));
    expect(radio.value).toBe(-1);
  });
});

describe('setValue', () => {
  it('sets value directly', () => {
    const radio = createRadio();
    expect(radio.value).toBe(-1);
    radio.setValue(2);
    expect(radio.value).toBe(2);
    expect(radio.selectedLabel).toBe('Blue');
  });

  it('does not dispatch change event', () => {
    const radio = createRadio();
    const changes: unknown[] = [];
    radio.on('change', data => changes.push(data));
    radio.setValue(1);
    expect(changes).toHaveLength(0);
  });
});

describe('setOptions', () => {
  it('replaces options', () => {
    const radio = createRadio();
    radio.setOptions(['X', 'Y']);
    expect(radio.options).toEqual(['X', 'Y']);
  });

  it('resets value if out of range', () => {
    const radio = createRadio({value: 2});
    radio.setOptions(['A', 'B']);
    expect(radio.value).toBe(-1);
  });

  it('keeps value if still valid', () => {
    const radio = createRadio({value: 1});
    radio.setOptions(['A', 'B', 'C']);
    expect(radio.value).toBe(1);
    expect(radio.selectedLabel).toBe('B');
  });

  it('clamps hoveredIndex', () => {
    const radio = createRadio();
    // Navigate to index 2
    radio.handleKey(key({key: 'ArrowDown'})); // -1 → 0
    radio.handleKey(key({key: 'ArrowDown'})); // 0 → 1
    radio.handleKey(key({key: 'ArrowDown'})); // 1 → 2
    radio.setOptions(['A']);
    // hoveredIndex clamped to 0
    radio.handleKey(key({key: 'Enter'}));
    expect(radio.value).toBe(0);
  });
});

describe('disabled state', () => {
  it('setDisabled changes state', () => {
    const radio = createRadio();
    expect(radio.acceptsFocus).toBe(true);
    radio.setDisabled(true);
    expect(radio.disabled).toBe(true);
    expect(radio.acceptsFocus).toBe(false);
  });
});

describe('focus / blur', () => {
  it('focus dispatches focus event', () => {
    const radio = createRadio();
    let focused = false;
    radio.on('focus', () => { focused = true; });
    radio.focus();
    expect(focused).toBe(true);
  });

  it('blur dispatches blur event', () => {
    const radio = createRadio();
    let blurred = false;
    radio.on('blur', () => { blurred = true; });
    radio.blur();
    expect(blurred).toBe(true);
  });
});

describe('rect and hit testing', () => {
  it('containsPoint checks bounds correctly', () => {
    const radio = createRadio({rectX: 5, rectY: 3, rectWidth: 20, rectHeight: 3});
    expect(radio.containsPoint(5, 3)).toBe(true);
    expect(radio.containsPoint(24, 3)).toBe(true);
    expect(radio.containsPoint(25, 3)).toBe(false);
    expect(radio.containsPoint(4, 3)).toBe(false);
    expect(radio.containsPoint(10, 5)).toBe(true);
    expect(radio.containsPoint(10, 6)).toBe(false);
  });

  it('updateRect updates position and size', () => {
    const radio = createRadio();
    radio.updateRect({rectX: 10, rectY: 20, rectWidth: 30, rectHeight: 5});
    const r = radio.rect;
    expect(r.rectX).toBe(10);
    expect(r.rectY).toBe(20);
    expect(r.rectWidth).toBe(30);
    expect(r.rectHeight).toBe(5);
  });
});

describe('unmounted', () => {
  it('unmounted while focused calls blur', () => {
    const radio = createRadio();
    let blurred = false;
    radio.on('blur', () => { blurred = true; });
    radio.focus();
    radio.unmounted();
    expect(blurred).toBe(true);
  });
});
