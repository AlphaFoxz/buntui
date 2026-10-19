import {describe, it, expect} from 'bun:test';
import {charCategory, charIndexAtColumn, CHAR_CATEGORY_CJK, CHAR_CATEGORY_PUNCT, CHAR_CATEGORY_SPACE, CHAR_CATEGORY_WORD} from '../text-measure';
import {wordEndAfter, wordRangeAt, wordStartBefore} from '../word-boundary';
import {deleteRange, normalizeSelectionRange} from '../selection';
import {UndoRedoStack} from '../undo-redo-stack';
import {clampInsertText, insertTextAt} from '../clipboard-edit-ops';
import {cycleCursorMode} from '../cursor-mode';

describe('charIndexAtColumn', () => {
  it('maps column to char index for ascii', () => {
    expect(charIndexAtColumn('hello', 3)).toBe(3);
  });

  it('accounts for CJK double width', () => {
    expect(charIndexAtColumn('你好', 0)).toBe(0);
    expect(charIndexAtColumn('你好', 1)).toBe(0);
    expect(charIndexAtColumn('你好', 2)).toBe(1);
    expect(charIndexAtColumn('你好', 4)).toBe(2);
  });

  it('clamps past end of text', () => {
    expect(charIndexAtColumn('ab', 10)).toBe(2);
  });
});

describe('charCategory', () => {
  it('classifies space', () => {
    expect(charCategory(0x20)).toBe(CHAR_CATEGORY_SPACE);
  });

  it('classifies CJK ranges', () => {
    expect(charCategory(0x4E_00)).toBe(CHAR_CATEGORY_CJK);
    expect(charCategory(0x9F_FF)).toBe(CHAR_CATEGORY_CJK);
    expect(charCategory(0xFF_08)).toBe(CHAR_CATEGORY_CJK);
  });

  it('classifies punctuation and word chars', () => {
    expect(charCategory(0x21)).toBe(CHAR_CATEGORY_PUNCT);
    expect(charCategory(0x3A)).toBe(CHAR_CATEGORY_PUNCT);
    expect(charCategory(0x61)).toBe(CHAR_CATEGORY_WORD);
    expect(charCategory(0x30)).toBe(CHAR_CATEGORY_WORD);
  });
});

describe('word boundaries', () => {
  it('wordRangeAt returns the word around pos', () => {
    expect(wordRangeAt('foo bar', 1)).toEqual([0, 3]);
    expect(wordRangeAt('foo bar', 5)).toEqual([4, 7]);
  });

  it('wordRangeAt keeps punctuation runs together', () => {
    expect(wordRangeAt('a.b', 1)).toEqual([1, 2]);
  });

  it('wordRangeAt on empty text', () => {
    expect(wordRangeAt('', 0)).toEqual([0, 0]);
  });

  it('wordStartBefore moves to previous word start', () => {
    expect(wordStartBefore('foo bar', 7)).toBe(4);
    expect(wordStartBefore('foo bar', 4)).toBe(3);
  });

  it('wordStartBefore at 0 stays at 0', () => {
    expect(wordStartBefore('abc', 0)).toBe(0);
  });

  it('wordEndAfter moves to next word end', () => {
    expect(wordEndAfter('foo bar', 0)).toBe(3);
    expect(wordEndAfter('foo bar', 3)).toBe(4);
  });

  it('wordEndAfter at end stays put', () => {
    expect(wordEndAfter('abc', 3)).toBe(3);
  });
});

describe('normalizeSelectionRange', () => {
  it('returns undefined when anchor equals cursor', () => {
    expect(normalizeSelectionRange(2, 2)).toBeUndefined();
  });

  it('normalizes both directions', () => {
    expect(normalizeSelectionRange(1, 4)).toEqual({start: 1, end: 4});
    expect(normalizeSelectionRange(4, 1)).toEqual({start: 1, end: 4});
  });
});

describe('deleteRange', () => {
  it('removes the range and reports the cursor', () => {
    expect(deleteRange('hello world', {start: 5, end: 11})).toEqual({value: 'hello', cursor: 5});
    expect(deleteRange('abc', {start: 1, end: 2})).toEqual({value: 'ac', cursor: 1});
  });
});

describe('UndoRedoStack', () => {
  it('undoes and redoes snapshots', () => {
    const stack = new UndoRedoStack<string>();
    expect(stack.undo('a')).toBeUndefined();
    stack.pushUndo('a');
    expect(stack.undo('b')).toBe('a');
    expect(stack.redo('a')).toBe('b');
    expect(stack.redo('b')).toBeUndefined();
  });

  it('clears the redo stack on pushUndo', () => {
    const stack = new UndoRedoStack<string>();
    stack.pushUndo('a');
    expect(stack.undo('b')).toBe('a');
    stack.pushUndo('c');
    expect(stack.redo('c')).toBeUndefined();
  });

  it('evicts oldest beyond the limit', () => {
    const stack = new UndoRedoStack<number>(3);
    stack.pushUndo(1);
    stack.pushUndo(2);
    stack.pushUndo(3);
    stack.pushUndo(4);
    expect(stack.undo(5)).toBe(4);
    expect(stack.undo(4)).toBe(3);
    expect(stack.undo(3)).toBe(2);
    expect(stack.undo(2)).toBeUndefined();
  });
});

describe('clipboard edit ops', () => {
  it('insertTextAt splices text at offset', () => {
    expect(insertTextAt('abc', 1, 'X')).toBe('aXbc');
    expect(insertTextAt('abc', 3, 'X')).toBe('abcX');
  });

  it('clampInsertText without limit returns full text', () => {
    expect(clampInsertText('hello', 0, 0)).toBe('hello');
  });

  it('clampInsertText truncates to remaining space', () => {
    expect(clampInsertText('hello', 3, 5)).toBe('he');
    expect(clampInsertText('hello', 5, 5)).toBe('');
  });
});

describe('cycleCursorMode', () => {
  it('cycles through all modes', () => {
    expect(cycleCursorMode('blinking-ibeam')).toBe('blinking-block');
    expect(cycleCursorMode('underscore')).toBe('blinking-ibeam');
  });
});
