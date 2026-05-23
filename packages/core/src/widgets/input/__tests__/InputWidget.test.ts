import {it, expect, describe, beforeEach, afterEach} from 'bun:test';
import {InputWidget} from '../InputWidget';
import type {KeyboardEvent, MouseEvent} from '../../../events/types';
import {setClipboard} from '../../../clipboard';
import type {ClipboardProvider} from '../../../clipboard/types';

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

  it('Escape does not cancel selection', () => {
    const input = createInput({value: 'hello'});
    input.focus();
    input.handleKey(key({key: 'a', ctrlKey: true}));
    expect(input.getSelection()).toBeDefined();
    input.handleKey(key({key: 'Escape'}));
    expect(input.getSelection()).toBeDefined();
  });

  it('Escape does not blur when there is no selection', () => {
    const input = createInput();
    input.focus();
    let blurred = false;
    input.on('blur', () => { blurred = true; });
    input.handleKey(key({key: 'Escape'}));
    expect(blurred).toBe(false);
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
    input.dispatch('mousedown', mouse({x: 7, y: 5}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('hXello');
  });

  it('click without shift clears selection', () => {
    const input = createInput({value: 'hello'});
    input.handleKey(key({key: 'a', ctrlKey: true}));
    expect(input.getSelection()).toBeDefined();
    input.dispatch('mousedown', mouse({x: 7, y: 5}));
    expect(input.getSelection()).toBeUndefined();
  });

  it('shift-click extends selection from cursor', () => {
    const input = createInput({value: 'hello', x: 5, y: 5});
    input.dispatch('mousedown', mouse({x: 7, y: 5}));
    input.dispatch('mousedown', mouse({x: 10, y: 5, shiftKey: true}));
    const sel = input.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.start).toBe(1);
    expect(sel!.end).toBe(4);
  });

  it('double-click selects word', () => {
    const input = createInput({value: 'hello world', x: 5, y: 5});
    input.dispatch('mousedown', mouse({x: 8, y: 5}));
    input.dispatch('mousedown', mouse({x: 8, y: 5}));
    const sel = input.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.start).toBe(0);
    expect(sel!.end).toBe(5);
  });

  it('double-click selects word at mid-character position', () => {
    const input = createInput({value: 'hello world', x: 5, y: 5});
    input.dispatch('mousedown', mouse({x: 12, y: 5}));
    input.dispatch('mousedown', mouse({x: 12, y: 5}));
    const sel = input.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.start).toBe(6);
    expect(sel!.end).toBe(11);
  });

  it('triple-click selects all', () => {
    const input = createInput({value: 'hello world', x: 5, y: 5});
    input.dispatch('mousedown', mouse({x: 8, y: 5}));
    input.dispatch('mousedown', mouse({x: 8, y: 5}));
    input.dispatch('mousedown', mouse({x: 8, y: 5}));
    const sel = input.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.start).toBe(0);
    expect(sel!.end).toBe(11);
  });

  it('click after timeout resets to single click', () => {
    const input = createInput({value: 'hello', x: 5, y: 5});
    const originalNow = Date.now;
    let currentTime = 0;
    Date.now = () => currentTime;
    try {
      currentTime = 0;
      input.dispatch('mousedown', mouse({x: 7, y: 5}));
      currentTime = 500;
      input.dispatch('mousedown', mouse({x: 7, y: 5}));
      expect(input.getSelection()).toBeUndefined();
    } finally {
      Date.now = originalNow;
    }
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

describe('Ctrl+Arrow word navigation', () => {
  it('Ctrl+ArrowRight skips current word run', () => {
    const input = createInput({value: 'hello world'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'ArrowRight', ctrlKey: true}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('helloX world');
  });

  it('Ctrl+ArrowLeft skips previous word run', () => {
    const input = createInput({value: 'hello world'});
    input.handleKey(key({key: 'ArrowLeft', ctrlKey: true}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('hello Xworld');
  });

  it('Ctrl+ArrowRight treats punctuation as its own segment', () => {
    const input = createInput({value: 'foo,bar'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'ArrowRight', ctrlKey: true}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('fooX,bar');
  });

  it('Ctrl+ArrowRight skips consecutive punctuation', () => {
    const input = createInput({value: 'foo::bar'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'ArrowRight', ctrlKey: true}));
    input.handleKey(key({key: 'ArrowRight', ctrlKey: true}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('foo::Xbar');
  });

  it('Ctrl+ArrowRight groups consecutive CJK characters', () => {
    const input = createInput({value: '你好,123'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'ArrowRight', ctrlKey: true}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('你好X,123');
  });

  it('Ctrl+ArrowRight skips punctuation after CJK', () => {
    const input = createInput({value: '你好,123'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'ArrowRight', ctrlKey: true}));
    input.handleKey(key({key: 'ArrowRight', ctrlKey: true}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('你好,X123');
  });

  it('Ctrl+ArrowLeft from within digits stops at segment start', () => {
    const input = createInput({value: '你好,123'});
    input.handleKey(key({key: 'ArrowLeft'}));
    input.handleKey(key({key: 'ArrowLeft', ctrlKey: true}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('你好,X123');
  });

  it('Ctrl+ArrowLeft skips back past punctuation to CJK', () => {
    const input = createInput({value: '你好,123'});
    input.handleKey(key({key: 'ArrowLeft'}));
    input.handleKey(key({key: 'ArrowLeft', ctrlKey: true}));
    input.handleKey(key({key: 'ArrowLeft', ctrlKey: true}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('你好X,123');
  });

  it('Ctrl+ArrowLeft skips back past CJK to start', () => {
    const input = createInput({value: '你好,123'});
    input.handleKey(key({key: 'ArrowLeft'}));
    input.handleKey(key({key: 'ArrowLeft', ctrlKey: true}));
    input.handleKey(key({key: 'ArrowLeft', ctrlKey: true}));
    input.handleKey(key({key: 'ArrowLeft', ctrlKey: true}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('X你好,123');
  });

  it('Ctrl+ArrowRight at end does nothing', () => {
    const input = createInput({value: 'abc'});
    input.handleKey(key({key: 'ArrowRight', ctrlKey: true}));
    expect(input.value).toBe('abc');
  });

  it('Ctrl+ArrowLeft at start does nothing', () => {
    const input = createInput({value: 'abc'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'ArrowLeft', ctrlKey: true}));
    expect(input.value).toBe('abc');
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

class MockClipboard {
  #content = '';

  read(): string {
    return this.#content;
  }

  write(text: string): void {
    this.#content = text;
  }
}

describe('clipboard support', () => {
  let clipboard: MockClipboard;
  let previousClipboard: ClipboardProvider;

  beforeEach(() => {
    clipboard = new MockClipboard();
    previousClipboard = setClipboard(clipboard);
  });

  afterEach(() => {
    setClipboard(previousClipboard);
  });

  describe('Ctrl+C (copy)', () => {
    it('copies selected text to clipboard', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'a', ctrlKey: true}));
      input.handleKey(key({key: 'c', ctrlKey: true}));
      expect(clipboard.read()).toBe('hello');
    });

    it('copies partial selection', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'Home'}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'c', ctrlKey: true}));
      expect(clipboard.read()).toBe('he');
    });

    it('does nothing without selection', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'c', ctrlKey: true}));
      expect(clipboard.read()).toBe('');
    });

    it('dispatches copy event', () => {
      const input = createInput({value: 'hello'});
      const events: unknown[] = [];
      input.on('copy', data => events.push(data));
      input.handleKey(key({key: 'a', ctrlKey: true}));
      input.handleKey(key({key: 'c', ctrlKey: true}));
      expect(events).toHaveLength(1);
      expect((events[0] as Record<string, string>).text).toBe('hello');
    });

    it('does not modify value', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'a', ctrlKey: true}));
      input.handleKey(key({key: 'c', ctrlKey: true}));
      expect(input.value).toBe('hello');
    });
  });

  describe('Ctrl+X (cut)', () => {
    it('cuts selected text to clipboard', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'Home'}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'x', ctrlKey: true}));
      expect(clipboard.read()).toBe('he');
      expect(input.value).toBe('llo');
    });

    it('cuts all text with Ctrl+A then Ctrl+X', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'a', ctrlKey: true}));
      input.handleKey(key({key: 'x', ctrlKey: true}));
      expect(clipboard.read()).toBe('hello');
      expect(input.value).toBe('');
    });

    it('does nothing without selection', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'x', ctrlKey: true}));
      expect(clipboard.read()).toBe('');
      expect(input.value).toBe('hello');
    });

    it('dispatches cut event', () => {
      const input = createInput({value: 'hello'});
      const events: unknown[] = [];
      input.on('cut', data => events.push(data));
      input.handleKey(key({key: 'a', ctrlKey: true}));
      input.handleKey(key({key: 'x', ctrlKey: true}));
      expect(events).toHaveLength(1);
      expect((events[0] as Record<string, string>).text).toBe('hello');
    });

    it('dispatches input event', () => {
      const input = createInput({value: 'hello'});
      const events: unknown[] = [];
      input.on('input', data => events.push(data));
      input.handleKey(key({key: 'a', ctrlKey: true}));
      input.handleKey(key({key: 'x', ctrlKey: true}));
      expect(events).toHaveLength(1);
      expect((events[0] as Record<string, string>).value).toBe('');
    });

    it('respects readonly mode', () => {
      const input = new InputWidget({value: 'hello', readonly: true});
      input.handleKey(key({key: 'a', ctrlKey: true}));
      input.handleKey(key({key: 'x', ctrlKey: true}));
      expect(clipboard.read()).toBe('');
      expect(input.value).toBe('hello');
    });
  });

  describe('Ctrl+V (paste)', () => {
    it('pastes text at cursor position', () => {
      const input = createInput({value: 'ab'});
      input.handleKey(key({key: 'ArrowLeft'}));
      clipboard.write('XY');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('aXYb');
    });

    it('pastes at beginning', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'Home'}));
      clipboard.write('say ');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('say hello');
    });

    it('pastes at end', () => {
      const input = createInput({value: 'hello'});
      clipboard.write(' world');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('hello world');
    });

    it('replaces selection then pastes', () => {
      const input = createInput({value: 'hello world'});
      input.handleKey(key({key: 'Home'}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      clipboard.write('goodbye');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('goodbye world');
    });

    it('does nothing when clipboard is empty', () => {
      const input = createInput({value: 'hello'});
      clipboard.write('');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('hello');
    });

    it('respects maxLength', () => {
      const input = createInput({value: 'ab', maxLength: 5});
      clipboard.write('cdefgh');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('abcde');
    });

    it('does not paste when at maxLength', () => {
      const input = createInput({value: 'abc', maxLength: 3});
      clipboard.write('X');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('abc');
    });

    it('pastes after deleting selection even at maxLength', () => {
      const input = createInput({value: 'abc', maxLength: 3});
      input.handleKey(key({key: 'a', ctrlKey: true}));
      clipboard.write('XY');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('XY');
    });

    it('dispatches paste event', () => {
      const input = createInput({value: 'ab'});
      clipboard.write('X');
      const events: unknown[] = [];
      input.on('paste', data => events.push(data));
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(events).toHaveLength(1);
      expect((events[0] as Record<string, string>).text).toBe('X');
    });

    it('dispatches input event', () => {
      const input = createInput({value: 'ab'});
      clipboard.write('X');
      const events: unknown[] = [];
      input.on('input', data => events.push(data));
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(events).toHaveLength(1);
      expect((events[0] as Record<string, string>).value).toBe('abX');
    });

    it('respects readonly mode', () => {
      const input = new InputWidget({value: 'hello', readonly: true});
      clipboard.write('world');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('hello');
    });

    it('handles multi-byte characters', () => {
      const input = createInput({value: 'ab'});
      clipboard.write('你好');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('ab你好');
    });
  });

  describe('cut-copy-paste round trip', () => {
    it('cut from one position and paste at another', () => {
      const input = createInput({value: 'hello world'});
      input.handleKey(key({key: 'Home'}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'x', ctrlKey: true}));
      expect(input.value).toBe(' world');
      input.handleKey(key({key: 'End'}));
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe(' worldhello');
    });

    it('copy does not remove text, paste inserts copy', () => {
      const input = createInput({value: 'abc'});
      input.handleKey(key({key: 'a', ctrlKey: true}));
      input.handleKey(key({key: 'c', ctrlKey: true}));
      input.handleKey(key({key: 'End'}));
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('abcabc');
    });
  });
});

describe('select() / setSelectionRange()', () => {
  it('select() selects all text', () => {
    const input = createInput({value: 'hello world'});
    input.select();
    const sel = input.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.start).toBe(0);
    expect(sel!.end).toBe(11);
    expect(sel!.text).toBe('hello world');
  });

  it('setSelectionRange selects a range', () => {
    const input = createInput({value: 'hello world'});
    input.setSelectionRange(2, 7);
    const sel = input.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.start).toBe(2);
    expect(sel!.end).toBe(7);
    expect(sel!.text).toBe('llo w');
  });

  it('setSelectionRange clamps to valid range', () => {
    const input = createInput({value: 'hi'});
    input.setSelectionRange(-5, 100);
    const sel = input.getSelection();
    expect(sel!.start).toBe(0);
    expect(sel!.end).toBe(2);
  });

  it('setSelectionRange normalizes reversed range', () => {
    const input = createInput({value: 'hello'});
    input.setSelectionRange(4, 1);
    const sel = input.getSelection();
    expect(sel!.start).toBe(1);
    expect(sel!.end).toBe(4);
  });

  it('select() on empty value results in no selection', () => {
    const input = createInput({value: ''});
    input.select();
    expect(input.getSelection()).toBeUndefined();
  });
});

describe('undo/redo', () => {
  describe('Ctrl+Z (undo)', () => {
    it('undoes a character insertion', () => {
      const input = createInput();
      input.handleKey(key({key: 'a'}));
      input.handleKey(key({key: 'b'}));
      expect(input.value).toBe('ab');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('a');
    });

    it('undoes multiple insertions step by step', () => {
      const input = createInput();
      input.handleKey(key({key: 'a'}));
      input.handleKey(key({key: 'b'}));
      input.handleKey(key({key: 'c'}));
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('ab');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('a');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('');
    });

    it('undoes backspace', () => {
      const input = createInput({value: 'abc'});
      input.handleKey(key({key: 'Backspace'}));
      expect(input.value).toBe('ab');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('abc');
    });

    it('undoes delete', () => {
      const input = createInput({value: 'abc'});
      input.handleKey(key({key: 'Home'}));
      input.handleKey(key({key: 'Delete'}));
      expect(input.value).toBe('bc');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('abc');
    });

    it('undoes selection deletion', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'Home'}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'Backspace'}));
      expect(input.value).toBe('llo');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('hello');
    });

    it('undoes Ctrl+Backspace (word delete)', () => {
      const input = createInput({value: 'hello world'});
      input.handleKey(key({key: 'Backspace', ctrlKey: true}));
      expect(input.value).toBe('hello ');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('hello world');
    });

    it('undoes Ctrl+Delete (word delete forward)', () => {
      const input = createInput({value: 'hello world'});
      input.handleKey(key({key: 'Home'}));
      input.handleKey(key({key: 'Delete', ctrlKey: true}));
      expect(input.value).toBe(' world');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('hello world');
    });

    it('restores cursor position', () => {
      const input = createInput();
      input.handleKey(key({key: 'a'}));
      input.handleKey(key({key: 'b'}));
      input.handleKey(key({key: 'z', ctrlKey: true}));
      input.handleKey(key({key: 'X'}));
      expect(input.value).toBe('aX');
    });

    it('restores selection', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'a', ctrlKey: true}));
      input.handleKey(key({key: 'Backspace'}));
      expect(input.value).toBe('');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      const sel = input.getSelection();
      expect(sel).toBeDefined();
      expect(sel!.text).toBe('hello');
    });

    it('does nothing when undo stack is empty', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('hello');
    });

    it('is blocked in readonly mode', () => {
      const input = new InputWidget({value: 'hello', readonly: true});
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('hello');
    });

    it('dispatches undo event', () => {
      const input = createInput();
      input.handleKey(key({key: 'a'}));
      const events: unknown[] = [];
      input.on('undo', data => events.push(data));
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(events).toHaveLength(1);
      expect((events[0] as Record<string, string>).value).toBe('');
    });

    it('clears redo stack on new edit after undo', () => {
      const input = createInput();
      input.handleKey(key({key: 'a'}));
      input.handleKey(key({key: 'b'}));
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('a');
      input.handleKey(key({key: 'c'}));
      input.handleKey(key({key: 'y', ctrlKey: true}));
      expect(input.value).toBe('ac');
    });
  });

  describe('Ctrl+Y (redo)', () => {
    it('redoes an undone character insertion', () => {
      const input = createInput();
      input.handleKey(key({key: 'a'}));
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('');
      input.handleKey(key({key: 'y', ctrlKey: true}));
      expect(input.value).toBe('a');
    });

    it('redoes multiple steps', () => {
      const input = createInput();
      input.handleKey(key({key: 'a'}));
      input.handleKey(key({key: 'b'}));
      input.handleKey(key({key: 'c'}));
      input.handleKey(key({key: 'z', ctrlKey: true}));
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('a');
      input.handleKey(key({key: 'y', ctrlKey: true}));
      expect(input.value).toBe('ab');
      input.handleKey(key({key: 'y', ctrlKey: true}));
      expect(input.value).toBe('abc');
    });

    it('does nothing when redo stack is empty', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'y', ctrlKey: true}));
      expect(input.value).toBe('hello');
    });

    it('is blocked in readonly mode', () => {
      const input = new InputWidget({value: 'hello', readonly: true});
      input.handleKey(key({key: 'y', ctrlKey: true}));
      expect(input.value).toBe('hello');
    });

    it('dispatches redo event', () => {
      const input = createInput();
      input.handleKey(key({key: 'a'}));
      input.handleKey(key({key: 'z', ctrlKey: true}));
      const events: unknown[] = [];
      input.on('redo', data => events.push(data));
      input.handleKey(key({key: 'y', ctrlKey: true}));
      expect(events).toHaveLength(1);
      expect((events[0] as Record<string, string>).value).toBe('a');
    });

    it('pushes redo state back to undo on undo-after-redo', () => {
      const input = createInput();
      input.handleKey(key({key: 'a'}));
      input.handleKey(key({key: 'z', ctrlKey: true}));
      input.handleKey(key({key: 'y', ctrlKey: true}));
      expect(input.value).toBe('a');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('');
    });
  });

  describe('undo/redo with clipboard operations', () => {
    let clipboard: MockClipboard;
    let previousClipboard: ClipboardProvider;

    beforeEach(() => {
      clipboard = new MockClipboard();
      previousClipboard = setClipboard(clipboard);
    });

    afterEach(() => {
      setClipboard(previousClipboard);
    });

    it('undoes cut', () => {
      const input = createInput({value: 'hello'});
      input.handleKey(key({key: 'Home'}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'x', ctrlKey: true}));
      expect(input.value).toBe('llo');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('hello');
    });

    it('undoes paste', () => {
      const input = createInput({value: 'ab'});
      clipboard.write('XY');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('abXY');
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('ab');
    });

    it('redoes paste', () => {
      const input = createInput({value: 'ab'});
      clipboard.write('XY');
      input.handleKey(key({key: 'v', ctrlKey: true}));
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value).toBe('ab');
      input.handleKey(key({key: 'y', ctrlKey: true}));
      expect(input.value).toBe('abXY');
    });
  });

  describe('undo stack limit', () => {
    it('caps at 100 entries', () => {
      const input = createInput();
      for (let i = 0; i < 110; i++) {
        input.handleKey(key({key: 'a'}));
      }

      expect(input.value.length).toBe(110);
      for (let i = 0; i < 100; i++) {
        input.handleKey(key({key: 'z', ctrlKey: true}));
      }

      expect(input.value.length).toBe(10);
      input.handleKey(key({key: 'z', ctrlKey: true}));
      expect(input.value.length).toBe(10);
    });
  });
});

describe('password mode', () => {
  it('stores actual value', () => {
    const input = new InputWidget({value: 'secret', type: 'password'});
    expect(input.value).toBe('secret');
  });

  it('allows typing characters', () => {
    const input = new InputWidget({type: 'password'});
    input.handleKey(key({key: 'a'}));
    input.handleKey(key({key: 'b'}));
    expect(input.value).toBe('ab');
  });

  it('allows backspace', () => {
    const input = new InputWidget({value: 'abc', type: 'password'});
    input.handleKey(key({key: 'Backspace'}));
    expect(input.value).toBe('ab');
  });

  it('allows selection', () => {
    const input = new InputWidget({value: 'hello', type: 'password'});
    input.handleKey(key({key: 'a', ctrlKey: true}));
    const sel = input.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.text).toBe('hello');
  });

  it('allows copy', () => {
    const clipboard = new MockClipboard();
    const prev = setClipboard(clipboard);
    try {
      const input = new InputWidget({value: 'secret', type: 'password'});
      input.handleKey(key({key: 'a', ctrlKey: true}));
      input.handleKey(key({key: 'c', ctrlKey: true}));
      expect(clipboard.read()).toBe('secret');
    } finally {
      setClipboard(prev);
    }
  });

  it('allows cut and paste', () => {
    const clipboard = new MockClipboard();
    const prev = setClipboard(clipboard);
    try {
      const input = new InputWidget({value: 'hello', type: 'password'});
      input.handleKey(key({key: 'Home'}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'ArrowRight', shiftKey: true}));
      input.handleKey(key({key: 'x', ctrlKey: true}));
      expect(input.value).toBe('llo');
      expect(clipboard.read()).toBe('he');
      input.handleKey(key({key: 'End'}));
      input.handleKey(key({key: 'v', ctrlKey: true}));
      expect(input.value).toBe('llohe');
    } finally {
      setClipboard(prev);
    }
  });

  it('allows undo/redo', () => {
    const input = new InputWidget({value: 'abc', type: 'password'});
    input.handleKey(key({key: 'Backspace'}));
    expect(input.value).toBe('ab');
    input.handleKey(key({key: 'z', ctrlKey: true}));
    expect(input.value).toBe('abc');
    input.handleKey(key({key: 'y', ctrlKey: true}));
    expect(input.value).toBe('ab');
  });

  it('defaults to text mode', () => {
    const input = new InputWidget({value: 'hello'});
    expect(input.value).toBe('hello');
  });

  it('allows navigation in password mode', () => {
    const input = new InputWidget({value: 'abc', type: 'password'});
    input.handleKey(key({key: 'Home'}));
    input.handleKey(key({key: 'ArrowRight'}));
    input.handleKey(key({key: 'X'}));
    expect(input.value).toBe('aXbc');
  });

  it('respects maxLength in password mode', () => {
    const input = new InputWidget({type: 'password', maxLength: 3});
    input.handleKey(key({key: 'a'}));
    input.handleKey(key({key: 'b'}));
    input.handleKey(key({key: 'c'}));
    input.handleKey(key({key: 'd'}));
    expect(input.value).toBe('abc');
  });
});

describe('updateColor', () => {
  it('updates normal and focused fg color', () => {
    const input = new InputWidget({colorFg: 0xFF_FF_FF_FF});
    input.updateColor({colorFg: 0x00_00_00_FF});
    const rect = input.rect;
    expect(rect).toBeDefined();
  });

  it('updates normal and focused bg color', () => {
    const input = new InputWidget({colorBg: 0x1E_1E_2E_FF});
    input.updateColor({colorBg: 0x00_00_00_FF});
    const rect = input.rect;
    expect(rect).toBeDefined();
  });

  it('updates both fg and bg together', () => {
    const input = new InputWidget({colorFg: 0xFF_FF_FF_FF, colorBg: 0x1E_1E_2E_FF});
    input.updateColor({colorFg: 0x00_00_00_FF, colorBg: 0xFF_FF_FF_FF});
    const rect = input.rect;
    expect(rect).toBeDefined();
  });

  it('does nothing when no colors provided', () => {
    const input = new InputWidget({colorFg: 0xFF_FF_FF_FF});
    input.updateColor({});
    expect(input.rect).toBeDefined();
  });
});

describe('updateBorder', () => {
  it('updates border style', () => {
    const input = new InputWidget({borderStyle: 'solid'});
    input.updateBorder({borderStyle: 'double'});
    expect(input.rect).toBeDefined();
  });

  it('does nothing when no border props provided', () => {
    const input = new InputWidget({borderStyle: 'solid'});
    input.updateBorder({});
    expect(input.rect).toBeDefined();
  });
});
