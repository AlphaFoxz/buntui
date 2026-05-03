import {it, expect, describe} from 'bun:test';
import {InputWidget} from '../InputWidget';
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

function createInput(options?: {value?: string; maxLength?: number; width?: number; x?: number; y?: number}) {
  return new InputWidget({
    value: options?.value ?? '',
    maxLength: options?.maxLength ?? 0,
    width: options?.width ?? 20,
    x: options?.x ?? 5,
    y: options?.y ?? 5,
  });
}

describe('construction', () => {
  it('starts with empty value', () => {
    const input = createInput();
    expect(input.value).toBe('');
  });

  it('initializes with given value', () => {
    const input = createInput({value: 'hello'});
    expect(input.value).toBe('hello');
  });

  it('accepts focus', () => {
    expect(createInput().acceptsFocus).toBe(true);
  });
});

describe('typing', () => {
  it('appends a character', () => {
    const input = createInput();
    input.handleKey(key({key: 'a'}));
    expect(input.value).toBe('a');
  });

  it('appends multiple characters', () => {
    const input = createInput();
    input.handleKey(key({key: 'h'}));
    input.handleKey(key({key: 'i'}));
    expect(input.value).toBe('hi');
  });

  it('inserts at cursor position', () => {
    const input = createInput({value: 'ab'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('Xab');
  });

  it('ignores Ctrl+letter as printable', () => {
    const input = createInput();
    input.handleKey(key({key: 'a', ctrlKey: true}));
    expect(input.value).toBe('');
  });

  it('ignores Alt+letter as printable', () => {
    const input = createInput();
    input.handleKey(key({key: 'a', altKey: true}));
    expect(input.value).toBe('');
  });

  it('respects maxLength', () => {
    const input = createInput({maxLength: 3});
    input.handleKey(key({key: 'a'}));
    input.handleKey(key({key: 'b'}));
    input.handleKey(key({key: 'c'}));
    input.handleKey(key({key: 'd'}));
    expect(input.value).toBe('abc');
  });

  it('allows typing over selection even at maxLength', () => {
    const input = createInput({value: 'abc', maxLength: 3});
    input.handleKey(key({key: 'a', ctrlKey: true}));
    input.handleKey(key({key: 'z'}));
    expect(input.value).toBe('z');
  });

  it('dispatches input event', () => {
    const input = createInput();
    const events: unknown[] = [];
    input.on('input', data => events.push(data));
    input.handleKey(key({key: 'x'}));
    expect(events).toHaveLength(1);
    expect((events[0] as Record<string, unknown>).value).toBe('x');
  });
});

describe('navigation', () => {
  it('ArrowLeft moves cursor back', () => {
    const input = createInput({value: 'abc'});
    input.handleKey(key({key: 'ArrowLeft'}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('abXc');
  });

  it('ArrowRight moves cursor forward', () => {
    const input = createInput({value: 'abc'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'ArrowRight'}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('aXbc');
  });

  it('ArrowLeft clamps at 0', () => {
    const input = createInput();
    input.handleKey(key({key: 'ArrowLeft'}));
    expect(input.value).toBe('');
  });

  it('ArrowRight clamps at end', () => {
    const input = createInput({value: 'ab'});
    input.handleKey(key({key: 'ArrowRight'}));
    input.handleKey(key({key: 'ArrowRight'}));
    input.handleKey(key({key: 'ArrowRight'}));
    expect(input.value).toBe('ab');
  });

  it('Home moves cursor to start', () => {
    const input = createInput({value: 'abc'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('Xabc');
  });

  it('End moves cursor to end', () => {
    const input = createInput({value: 'abc'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'End'}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('abcX');
  });
});

describe('deletion', () => {
  it('Backspace deletes character before cursor', () => {
    const input = createInput({value: 'abc'});
    input.handleKey(key({key: 'Backspace'}));
    expect(input.value).toBe('ab');
  });

  it('Backspace at position 0 does nothing', () => {
    const input = createInput({value: 'abc'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'Backspace'}));
    expect(input.value).toBe('abc');
  });

  it('Delete deletes character after cursor', () => {
    const input = createInput({value: 'abc'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'Delete'}));
    expect(input.value).toBe('bc');
  });

  it('Delete at end does nothing', () => {
    const input = createInput({value: 'ab'});
    input.handleKey(key({key: 'Delete'}));
    expect(input.value).toBe('ab');
  });
});

describe('selection — create', () => {
  it('Shift+ArrowLeft selects backward', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'ArrowLeft', shiftKey: true}));
    const sel = input.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.start).toBe(4);
    expect(sel!.end).toBe(5);
    expect(sel!.text).toBe('o');
  });

  it('Shift+ArrowRight selects forward', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
    const sel = input.getSelection();
    expect(sel!.start).toBe(0);
    expect(sel!.end).toBe(1);
    expect(sel!.text).toBe('h');
  });

  it('Shift+Home selects to beginning', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'Home', shiftKey: true}));
    const sel = input.getSelection();
    expect(sel!.start).toBe(0);
    expect(sel!.end).toBe(5);
  });

  it('Shift+End selects to end', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'End', shiftKey: true}));
    const sel = input.getSelection();
    expect(sel!.start).toBe(0);
    expect(sel!.end).toBe(5);
  });

  it('Ctrl+A selects all', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'a', ctrlKey: true}));
    const sel = input.getSelection();
    expect(sel!.start).toBe(0);
    expect(sel!.end).toBe(5);
    expect(sel!.text).toBe('hello');
  });

  it('Ctrl+A on empty value does not select', () => {
    const input = createInput();
    input.handleKey(key({key: 'a', ctrlKey: true}));
    expect(input.getSelection()).toBeUndefined();
  });

  it('multi-step Shift+Arrow extends selection', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
    input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
    input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
    const sel = input.getSelection();
    expect(sel!.text).toBe('hel');
  });
});

describe('selection — clear', () => {
  it('arrow key without Shift clears selection', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'a', ctrlKey: true}));
    expect(input.getSelection()).toBeDefined();
    input.handleKey(key({key: 'ArrowLeft'}));
    expect(input.getSelection()).toBeUndefined();
  });

  it('Escape cancels selection without blurring', () => {
    const input = createInput({value: 'hello'});
    input.focus();
    input.handleKey(key({key: 'a', ctrlKey: true}));
    expect(input.getSelection()).toBeDefined();
    input.handleKey(key({key: 'Escape'}));
    expect(input.getSelection()).toBeUndefined();
  });

  it('Escape blurs when there is no selection', () => {
    const input = createInput();
    input.focus();
    let blurred = false;
    input.on('blur', () => { blurred = true; });
    input.handleKey(key({key: 'Escape'}));
    expect(blurred).toBe(true);
  });
});

describe('selection — operations', () => {
  it('Backspace deletes selection', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'a', ctrlKey: true}));
    input.handleKey(key({key: 'Backspace'}));
    expect(input.value).toBe('');
  });

  it('Delete deletes selection', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'a', ctrlKey: true}));
    input.handleKey(key({key: 'Delete'}));
    expect(input.value).toBe('');
  });

  it('typing replaces selection', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
    input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
    input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
    // Selected 'hel' (0..3), typing replaces it
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('Xlo');
  });
});

describe('Enter', () => {
  it('dispatches submit event with current value', () => {
    const input = createInput({value: 'hello'});
    let submitValue: string | undefined = '';
    input.on('submit', data => {
      submitValue = (data as Record<string, string>).value;
    });
    input.handleKey(key({key: 'Enter'}));
    expect(submitValue).toBe('hello');
  });

  it('clears selection on submit', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'a', ctrlKey: true}));
    input.handleKey(key({key: 'Enter'}));
    expect(input.getSelection()).toBeUndefined();
  });
});

describe('updateValue', () => {
  it('replaces value', () => {
    const input = createInput({value: 'hello'});
    input.updateValue('world');
    expect(input.value).toBe('world');
  });

  it('clears selection', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'a', ctrlKey: true}));
    input.updateValue('new');
    expect(input.getSelection()).toBeUndefined();
  });

  it('clamps cursor to new length', () => {
    const input = createInput({value: 'hello'});
    input.updateValue('ab');
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('abX');
  });
});

describe('mouse click', () => {
  it('click positions cursor at the clicked column', () => {
    const input = createInput({value: 'hello', x: 5, y: 5});
    // innerX = (8 - 1) - 5 - 1 = 1 → char index 1
    input.dispatch('mousedown', mouse({x: 8, y: 6}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('hXello');
  });

  it('click without shift clears selection', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'a', ctrlKey: true}));
    expect(input.getSelection()).toBeDefined();
    input.dispatch('mousedown', mouse({x: 8, y: 6}));
    expect(input.getSelection()).toBeUndefined();
  });

  it('shift-click extends selection from cursor', () => {
    const input = createInput({value: 'hello', x: 5, y: 5});
    // Click at col 1 → cursor at index 1
    input.dispatch('mousedown', mouse({x: 8, y: 6}));
    // Shift-click at col 4 → extend selection from 1 to 4
    input.dispatch('mousedown', mouse({x: 11, y: 6, shiftKey: true}));
    const sel = input.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.start).toBe(1);
    expect(sel!.end).toBe(4);
  });
});

describe('focus / blur', () => {
  it('focus dispatches focus event', () => {
    const input = createInput();
    let focused = false;
    input.on('focus', () => { focused = true; });
    input.focus();
    expect(focused).toBe(true);
  });

  it('blur dispatches blur event', () => {
    const input = createInput();
    let blurred = false;
    input.on('blur', () => { blurred = true; });
    input.blur();
    expect(blurred).toBe(true);
  });

  it('blur clears selection', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'a', ctrlKey: true}));
    input.blur();
    expect(input.getSelection()).toBeUndefined();
  });
});

describe('scroll behavior', () => {
  it('handles cursor beyond visible width', () => {
    const input = createInput({value: 'abcdefghijklmnopqrstuv', width: 10});
    input.handleKey(key({key: 'End'}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('abcdefghijklmnopqrstuvX');
  });

  it('scrolls back when text shrinks', () => {
    const input = createInput({value: 'abcdefghijklmnopqrstuv', width: 10});
    for (let i = 0; i < 10; i++) {
      input.handleKey(key({key: 'Backspace'}));
    }

    expect(input.value).toBe('abcdefghijkl');
  });
});

describe('edge cases', () => {
  it('ignores undefined key', () => {
    const input = createInput();
    input.handleKey({key: undefined, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, charCode: 0});
    expect(input.value).toBe('');
  });

  it('ignores unknown special keys', () => {
    const input = createInput();
    input.handleKey(key({key: 'F1'}));
    expect(input.value).toBe('');
  });

  it('containsPoint checks bounds correctly', () => {
    const input = createInput({x: 5, y: 5, width: 20});
    expect(input.containsPoint(5, 5)).toBe(true);
    expect(input.containsPoint(24, 5)).toBe(true);
    expect(input.containsPoint(25, 5)).toBe(false);
    expect(input.containsPoint(4, 5)).toBe(false);
    expect(input.containsPoint(10, 7)).toBe(true);
    expect(input.containsPoint(10, 8)).toBe(false);
  });

  it('updateRect updates position and size', () => {
    const input = createInput();
    input.updateRect({x: 10, y: 20, width: 30, height: 5});
    const r = input.rect;
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.width).toBe(30);
    expect(r.height).toBe(5);
  });
});
