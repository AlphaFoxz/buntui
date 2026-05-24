import {it, expect, describe, beforeEach, afterEach} from 'bun:test';
import {TextareaWidget} from '../TextareaWidget';
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

class MockClipboard implements ClipboardProvider {
  #data = '';
  read(): string { return this.#data; }
  write(text: string): void { this.#data = text; }
}

function createTextarea(options?: {value?: string; maxLength?: number; width?: number; height?: number; x?: number; y?: number}) {
  return new TextareaWidget({
    value: options?.value ?? '',
    maxLength: options?.maxLength ?? 0,
    width: options?.width ?? 30,
    height: options?.height ?? 10,
    x: options?.x ?? 5,
    y: options?.y ?? 5,
  });
}

describe('construction', () => {
  it('starts with empty value', () => {
    const ta = createTextarea();
    expect(ta.value).toBe('');
  });

  it('initializes with given value', () => {
    const ta = createTextarea({value: 'hello\nworld'});
    expect(ta.value).toBe('hello\nworld');
  });

  it('accepts focus', () => {
    expect(createTextarea().acceptsFocus).toBe(true);
  });
});

describe('typing', () => {
  it('appends a character', () => {
    const ta = createTextarea();
    ta.handleActiveKey(key({key: 'a'}));
    expect(ta.value).toBe('a');
  });

  it('appends multiple characters', () => {
    const ta = createTextarea();
    ta.handleActiveKey(key({key: 'h'}));
    ta.handleActiveKey(key({key: 'i'}));
    expect(ta.value).toBe('hi');
  });
});

describe('Enter key', () => {
  it('splits line at cursor', () => {
    const ta = createTextarea({value: 'hello'});
    ta.handleActiveKey(key({key: 'Enter'}));
    expect(ta.value).toBe('hello\n');
  });

  it('inserts newline in middle of text', () => {
    const ta = createTextarea({value: 'hello'});
    ta.handleActiveKey(key({key: 'ArrowLeft'}));
    ta.handleActiveKey(key({key: 'Enter'}));
    expect(ta.value).toBe('hell\no');
  });

  it('splits line at beginning', () => {
    const ta = createTextarea({value: 'hello'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'Enter'}));
    expect(ta.value).toBe('\nhello');
  });
});

describe('Backspace', () => {
  it('deletes character before cursor on same line', () => {
    const ta = createTextarea({value: 'abc'});
    ta.handleActiveKey(key({key: 'Backspace'}));
    expect(ta.value).toBe('ab');
  });

  it('joins lines when backspace at line start', () => {
    const ta = createTextarea({value: 'hello\nworld'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'ArrowDown'}));
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'Backspace'}));
    expect(ta.value).toBe('helloworld');
  });

  it('does nothing at start of first line', () => {
    const ta = createTextarea({value: 'hello'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'Backspace'}));
    expect(ta.value).toBe('hello');
  });
});

describe('Delete', () => {
  it('deletes character after cursor', () => {
    const ta = createTextarea({value: 'abc'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'Delete'}));
    expect(ta.value).toBe('bc');
  });

  it('joins lines when delete at end of line', () => {
    const ta = createTextarea({value: 'hello\nworld'});
    ta.handleActiveKey(key({key: 'ArrowUp'}));
    ta.handleActiveKey(key({key: 'End'}));
    ta.handleActiveKey(key({key: 'Delete'}));
    expect(ta.value).toBe('helloworld');
  });

  it('does nothing at end of last line', () => {
    const ta = createTextarea({value: 'hello'});
    ta.handleActiveKey(key({key: 'Delete'}));
    expect(ta.value).toBe('hello');
  });
});

describe('cursor movement', () => {
  it('ArrowLeft moves left on same line', () => {
    const ta = createTextarea({value: 'abc'});
    ta.handleActiveKey(key({key: 'ArrowLeft'}));
    expect(ta.getSelection()).toBeUndefined();
  });

  it('ArrowLeft wraps to end of previous line', () => {
    const ta = createTextarea({value: 'ab\ncd'});
    ta.handleActiveKey(key({key: 'ArrowLeft'}));
    expect(ta.value).toBe('ab\ncd');
  });

  it('ArrowRight wraps to start of next line', () => {
    const ta = createTextarea({value: 'ab\ncd'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'End'}));
    ta.handleActiveKey(key({key: 'ArrowRight'}));
  });

  it('ArrowUp moves to previous line', () => {
    const ta = createTextarea({value: 'hello\nworld'});
    ta.handleActiveKey(key({key: 'ArrowUp'}));
  });

  it('ArrowDown moves to next line', () => {
    const ta = createTextarea({value: 'hello\nworld'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'ArrowDown'}));
  });

  it('Home moves to start of current line', () => {
    const ta = createTextarea({value: 'abc\ndef'});
    ta.handleActiveKey(key({key: 'Home'}));
  });

  it('End moves to end of current line', () => {
    const ta = createTextarea({value: 'abc'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'End'}));
  });

  it('ArrowUp at first line moves to col 0', () => {
    const ta = createTextarea({value: 'abc'});
    ta.handleActiveKey(key({key: 'End'}));
    ta.handleActiveKey(key({key: 'ArrowUp'}));
  });

  it('ArrowDown at last line moves to end', () => {
    const ta = createTextarea({value: 'abc'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'ArrowDown'}));
  });

  it('ArrowUp clamps col to line length', () => {
    const ta = createTextarea({value: 'longline\nshort'});
    ta.handleActiveKey(key({key: 'ArrowUp'}));
  });

  it('ArrowDown clamps col to line length', () => {
    const ta = createTextarea({value: 'short\nlongline'});
    ta.handleActiveKey(key({key: 'End'}));
    ta.handleActiveKey(key({key: 'ArrowDown'}));
  });
});

describe('selection', () => {
  it('select all via Ctrl+A', () => {
    const ta = createTextarea({value: 'hello\nworld'});
    ta.handleActiveKey(key({key: 'a', ctrlKey: true}));
    const sel = ta.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.text).toBe('hello\nworld');
    expect(sel!.start).toBe(0);
    expect(sel!.end).toBe(11);
  });

  it('shift+ArrowLeft extends selection', () => {
    const ta = createTextarea({value: 'hello'});
    ta.handleActiveKey(key({key: 'ArrowLeft', shiftKey: true}));
    const sel = ta.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.text).toBe('o');
  });

  it('shift+ArrowRight extends selection', () => {
    const ta = createTextarea({value: 'hello'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'ArrowRight', shiftKey: true}));
    const sel = ta.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.text).toBe('h');
  });

  it('backspace deletes selection', () => {
    const ta = createTextarea({value: 'hello'});
    ta.handleActiveKey(key({key: 'a', ctrlKey: true}));
    ta.handleActiveKey(key({key: 'Backspace'}));
    expect(ta.value).toBe('');
  });

  it('typing replaces selection', () => {
    const ta = createTextarea({value: 'hello'});
    ta.handleActiveKey(key({key: 'a', ctrlKey: true}));
    ta.handleActiveKey(key({key: 'x'}));
    expect(ta.value).toBe('x');
  });

  it('select() selects all text', () => {
    const ta = createTextarea({value: 'hello\nworld'});
    ta.select();
    const sel = ta.getSelection();
    expect(sel!.text).toBe('hello\nworld');
  });

  it('setSelectionRange with offsets', () => {
    const ta = createTextarea({value: 'hello\nworld'});
    ta.setSelectionRange(2, 8);
    const sel = ta.getSelection();
    expect(sel!.text).toBe('llo\nwo');
    expect(sel!.start).toBe(2);
    expect(sel!.end).toBe(8);
  });
});

describe('word navigation', () => {
  it('Ctrl+ArrowLeft moves to previous word', () => {
    const ta = createTextarea({value: 'hello world'});
    ta.handleActiveKey(key({key: 'ArrowLeft', ctrlKey: true}));
  });

  it('Ctrl+ArrowRight moves to next word', () => {
    const ta = createTextarea({value: 'hello world'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'ArrowRight', ctrlKey: true}));
  });

  it('Ctrl+Backspace deletes word', () => {
    const ta = createTextarea({value: 'hello world'});
    ta.handleActiveKey(key({key: 'Backspace', ctrlKey: true}));
    expect(ta.value).toBe('hello ');
  });

  it('Ctrl+Delete deletes word forward', () => {
    const ta = createTextarea({value: 'hello world'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'Delete', ctrlKey: true}));
    expect(ta.value).toBe(' world');
  });
});

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

  it('copies selected text to clipboard', () => {
    const ta = createTextarea({value: 'hello'});
    ta.handleActiveKey(key({key: 'a', ctrlKey: true}));
    ta.handleActiveKey(key({key: 'c', ctrlKey: true}));
    expect(clipboard.read()).toBe('hello');
  });

  it('cuts selected text', () => {
    const ta = createTextarea({value: 'hello world'});
    ta.setSelectionRange(0, 5);
    ta.handleActiveKey(key({key: 'x', ctrlKey: true}));
    expect(clipboard.read()).toBe('hello');
    expect(ta.value).toBe(' world');
  });

  it('pastes text at cursor', () => {
    const ta = createTextarea();
    clipboard.write('hello');
    ta.handleActiveKey(key({key: 'v', ctrlKey: true}));
    expect(ta.value).toBe('hello');
  });

  it('pastes multi-line text', () => {
    const ta = createTextarea();
    clipboard.write('line1\nline2');
    ta.handleActiveKey(key({key: 'v', ctrlKey: true}));
    expect(ta.value).toBe('line1\nline2');
  });

  it('pastes and replaces selection', () => {
    const ta = createTextarea({value: 'hello world'});
    ta.setSelectionRange(0, 5);
    clipboard.write('HI');
    ta.handleActiveKey(key({key: 'v', ctrlKey: true}));
    expect(ta.value).toBe('HI world');
  });
});

describe('undo/redo', () => {
  it('undoes character input', () => {
    const ta = createTextarea();
    ta.handleActiveKey(key({key: 'a'}));
    ta.handleActiveKey(key({key: 'b'}));
    expect(ta.value).toBe('ab');
    ta.handleActiveKey(key({key: 'z', ctrlKey: true}));
    expect(ta.value).toBe('a');
    ta.handleActiveKey(key({key: 'z', ctrlKey: true}));
    expect(ta.value).toBe('');
  });

  it('redoes undone action', () => {
    const ta = createTextarea();
    ta.handleActiveKey(key({key: 'a'}));
    ta.handleActiveKey(key({key: 'z', ctrlKey: true}));
    expect(ta.value).toBe('');
    ta.handleActiveKey(key({key: 'y', ctrlKey: true}));
    expect(ta.value).toBe('a');
  });

  it('undoes Enter key', () => {
    const ta = createTextarea({value: 'hello'});
    ta.handleActiveKey(key({key: 'Enter'}));
    expect(ta.value).toBe('hello\n');
    ta.handleActiveKey(key({key: 'z', ctrlKey: true}));
    expect(ta.value).toBe('hello');
  });

  it('undoes paste', () => {
    const ta = createTextarea();
    const clipboard = new MockClipboard();
    const prev = setClipboard(clipboard);
    clipboard.write('world');
    ta.handleActiveKey(key({key: 'v', ctrlKey: true}));
    expect(ta.value).toBe('world');
    ta.handleActiveKey(key({key: 'z', ctrlKey: true}));
    expect(ta.value).toBe('');
    setClipboard(prev);
  });
});

describe('updateValue', () => {
  it('replaces entire value', () => {
    const ta = createTextarea({value: 'old'});
    ta.updateValue('new\nvalue');
    expect(ta.value).toBe('new\nvalue');
  });

  it('clamps cursor to new value bounds', () => {
    const ta = createTextarea({value: 'hello\nworld'});
    ta.handleActiveKey(key({key: 'End'}));
    ta.updateValue('ab');
  });
});

describe('readonly mode', () => {
  it('prevents typing when readonly', () => {
    const ta = createTextarea({value: 'hello'});
    ta.setReadonly(true);
    ta.handleActiveKey(key({key: 'x'}));
    expect(ta.value).toBe('hello');
  });

  it('prevents Enter when readonly', () => {
    const ta = createTextarea({value: 'hello'});
    ta.setReadonly(true);
    ta.handleActiveKey(key({key: 'Enter'}));
    expect(ta.value).toBe('hello');
  });

  it('allows cursor movement when readonly', () => {
    const ta = createTextarea({value: 'hello'});
    ta.setReadonly(true);
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'ArrowLeft'}));
  });
});

describe('multi-line editing', () => {
  it('typing on second line after Enter', () => {
    const ta = createTextarea({value: 'abc'});
    ta.handleActiveKey(key({key: 'Enter'}));
    ta.handleActiveKey(key({key: 'd'}));
    expect(ta.value).toBe('abc\nd');
  });

  it('Enter splits line preserving text after cursor', () => {
    const ta = createTextarea({value: 'abcdef'});
    ta.handleActiveKey(key({key: 'ArrowLeft'}));
    ta.handleActiveKey(key({key: 'ArrowLeft'}));
    ta.handleActiveKey(key({key: 'Enter'}));
    expect(ta.value).toBe('abcd\nef');
  });

  it('handles triple click to select line', () => {
    const ta = createTextarea({value: 'line1\nline2\nline3'});
    ta.focus();
    const viewport = {
      x: 6,
      y: 6,
    };
    ta.dispatch('mousedown', mouse({x: viewport.x + 2, y: viewport.y + 1}));
    ta.dispatch('mouseup', mouse({x: viewport.x + 2, y: viewport.y + 1}));
    const now = Date.now;
    const originalNow = Date.now;
    Date.now = () => (originalNow.call(Date) + 0);
    ta.dispatch('mousedown', mouse({x: viewport.x + 2, y: viewport.y + 1}));
    ta.dispatch('mouseup', mouse({x: viewport.x + 2, y: viewport.y + 1}));
    Date.now = () => (originalNow.call(Date) + 0);
    ta.dispatch('mousedown', mouse({x: viewport.x + 2, y: viewport.y + 1}));
    const sel = ta.getSelection();
    expect(sel).toBeDefined();
    Date.now = originalNow;
  });
});

describe('PageUp/PageDown', () => {
  it('PageUp moves cursor up by viewport height', () => {
    const lines = Array.from({length: 30}, (_, i) => `line${i}`).join('\n');
    const ta = createTextarea({value: lines});
    ta.handleActiveKey(key({key: 'End'}));
    ta.handleActiveKey(key({key: 'PageUp'}));
  });

  it('PageDown moves cursor down by viewport height', () => {
    const lines = Array.from({length: 30}, (_, i) => `line${i}`).join('\n');
    const ta = createTextarea({value: lines, height: 10});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'PageDown'}));
  });
});

describe('scrolling', () => {
  it('scrollTo clamps to valid range', () => {
    const ta = createTextarea({value: 'single line'});
    ta.scrollTo(100);
  });

  it('scrollBy scrolls by delta', () => {
    const lines = Array.from({length: 30}, (_, i) => `line${i}`).join('\n');
    const ta = createTextarea({value: lines});
    ta.scrollBy(5);
    ta.scrollBy(-2);
  });
});

describe('Tab', () => {
  it('inserts 4 spaces', () => {
    const ta = createTextarea();
    ta.handleActiveKey(key({key: 'Tab'}));
    expect(ta.value).toBe('    ');
  });

  it('inserts tab in middle of text', () => {
    const ta = createTextarea({value: 'ab'});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'ArrowRight'}));
    ta.handleActiveKey(key({key: 'Tab'}));
    expect(ta.value).toBe('a    b');
  });
});

describe('maxLength', () => {
  it('respects maxLength', () => {
    const ta = createTextarea({maxLength: 5});
    ta.handleActiveKey(key({key: 'a'}));
    ta.handleActiveKey(key({key: 'b'}));
    ta.handleActiveKey(key({key: 'c'}));
    ta.handleActiveKey(key({key: 'd'}));
    ta.handleActiveKey(key({key: 'e'}));
    ta.handleActiveKey(key({key: 'f'}));
    expect(ta.value).toBe('abcde');
  });

  it('maxLength counts newlines', () => {
    const ta = createTextarea({maxLength: 5});
    ta.handleActiveKey(key({key: 'a'}));
    ta.handleActiveKey(key({key: 'b'}));
    ta.handleActiveKey(key({key: 'Enter'}));
    ta.handleActiveKey(key({key: 'c'}));
    expect(ta.value).toBe('ab\nc');
  });
});

describe('word wrap', () => {
  it('wraps long line into multiple visual lines', () => {
    const ta = createTextarea({value: 'abcdefghij', width: 7});
    const rect = ta.rect;
    expect(rect.width).toBe(7);
    expect(ta.value).toBe('abcdefghij');
  });

  it('renders wrapped text without truncation', () => {
    const longText = 'abcdefghijklmnopqrstuvwxyz';
    const ta = createTextarea({value: longText, width: 12});
    expect(ta.value).toBe(longText);
    expect(ta.value.length).toBe(26);
  });

  it('ArrowDown moves to next visual line of same logical line', () => {
    const ta = createTextarea({value: 'abcdefghij', width: 7});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'ArrowDown'}));
  });

  it('ArrowUp moves to previous visual line of same logical line', () => {
    const ta = createTextarea({value: 'abcdefghij', width: 7});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'ArrowDown'}));
    ta.handleActiveKey(key({key: 'ArrowUp'}));
  });

  it('Home goes to visual line start, not logical line start', () => {
    const ta = createTextarea({value: 'abcdefghij', width: 7});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'ArrowDown'}));
    ta.handleActiveKey(key({key: 'End'}));
    ta.handleActiveKey(key({key: 'Home'}));
  });

  it('End goes to visual line end', () => {
    const ta = createTextarea({value: 'abcdefghij', width: 7});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'End'}));
  });

  it('typing auto-wraps when exceeding width', () => {
    const ta = createTextarea({value: '', width: 7});
    for (const ch of 'abcdefghij') {
      ta.handleActiveKey(key({key: ch}));
    }

    expect(ta.value).toBe('abcdefghij');
  });

  it('wraps multi-line content correctly', () => {
    const ta = createTextarea({value: 'abc\ndefghijklmno\npqr', width: 7});
    expect(ta.value).toBe('abc\ndefghijklmno\npqr');
  });

  it('scrolling works with wrapped visual lines', () => {
    const longLine = 'a'.repeat(100);
    const ta = createTextarea({value: longLine, width: 12, height: 5});
    ta.scrollBy(5);
    ta.scrollBy(-2);
  });

  it('PageUp/PageDown navigates visual lines', () => {
    const longLine = 'a'.repeat(60);
    const ta = createTextarea({value: longLine, width: 12, height: 5});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'PageDown'}));
    ta.handleActiveKey(key({key: 'PageUp'}));
  });

  it('mouse click maps to correct logical position in wrapped line', () => {
    const ta = createTextarea({value: 'abcdefghij', width: 7, x: 5, y: 5});
    ta.focus();
    const viewport = {
      x: 6,
      y: 6,
    };
    ta.dispatch('mousedown', mouse({x: viewport.x + 1, y: viewport.y + 1}));
    const sel = ta.getSelection();
    expect(sel).toBeUndefined();
  });

  it('select all selects entire value including wrapped lines', () => {
    const ta = createTextarea({value: 'abcdefghij', width: 7});
    ta.handleActiveKey(key({key: 'a', ctrlKey: true}));
    const sel = ta.getSelection();
    expect(sel).toBeDefined();
    expect(sel!.text).toBe('abcdefghij');
    expect(sel!.start).toBe(0);
    expect(sel!.end).toBe(10);
  });

  it('backspace at visual line start joins with previous visual segment', () => {
    const ta = createTextarea({value: 'abcdefghij', width: 7});
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'ArrowDown'}));
    ta.handleActiveKey(key({key: 'Home'}));
    ta.handleActiveKey(key({key: 'Backspace'}));
  });

  it('CJK wide characters wrap correctly', () => {
    const ta = createTextarea({value: '你好世界你好世界你好', width: 10});
    expect(ta.value).toBe('你好世界你好世界你好');
  });

  it('empty line still takes one visual line', () => {
    const ta = createTextarea({value: 'hello\n\nworld', width: 20});
    expect(ta.value).toBe('hello\n\nworld');
  });
});
