import {it, expect, describe} from 'bun:test';
import {charDisplayWidth, stringDisplayWidth, truncateToWidth} from '../string-width';

describe('charDisplayWidth', () => {
  it('returns 0 for control characters', () => {
    expect(charDisplayWidth('\0')).toBe(0);
    expect(charDisplayWidth('\n')).toBe(0);
    expect(charDisplayWidth('\r')).toBe(0);
    expect(charDisplayWidth('\t')).toBe(0);
  });

  it('returns 0 for DEL (0x7F)', () => {
    expect(charDisplayWidth('\x7F')).toBe(0);
  });

  it('returns 1 for ASCII printable characters', () => {
    expect(charDisplayWidth('a')).toBe(1);
    expect(charDisplayWidth('Z')).toBe(1);
    expect(charDisplayWidth('0')).toBe(1);
    expect(charDisplayWidth(' ')).toBe(1);
    expect(charDisplayWidth('!')).toBe(1);
  });

  it('returns 2 for CJK Unified Ideographs', () => {
    expect(charDisplayWidth('中')).toBe(2);
    expect(charDisplayWidth('文')).toBe(2);
    expect(charDisplayWidth('字')).toBe(2);
  });

  it('returns 2 for CJK Extension A', () => {
    expect(charDisplayWidth('\u{3400}')).toBe(2);
    expect(charDisplayWidth('\u{4DBF}')).toBe(2);
  });

  it('returns 2 for Hiragana', () => {
    expect(charDisplayWidth('あ')).toBe(2);
    expect(charDisplayWidth('ん')).toBe(2);
  });

  it('returns 2 for Katakana', () => {
    expect(charDisplayWidth('ア')).toBe(2);
    expect(charDisplayWidth('ン')).toBe(2);
  });

  it('returns 2 for Hangul Syllables', () => {
    expect(charDisplayWidth('한')).toBe(2);
    expect(charDisplayWidth('글')).toBe(2);
  });

  it('returns 2 for Fullwidth forms', () => {
    expect(charDisplayWidth('！')).toBe(2);
    expect(charDisplayWidth('Ａ')).toBe(2);
  });

  it('returns 2 for emoji in supplementary plane', () => {
    expect(charDisplayWidth('🎉')).toBe(2); // U+1F389, in range 0x1F300-0x1F9FF
  });

  it('returns 2 for CJK Radicals Supplement', () => {
    expect(charDisplayWidth('\u{2E80}')).toBe(2);
    expect(charDisplayWidth('\u{2FDF}')).toBe(2);
  });

  it('returns 2 for Miscellaneous Symbols', () => {
    expect(charDisplayWidth('☀')).toBe(2);
    expect(charDisplayWidth('⚡')).toBe(2);
  });

  it('returns 1 for Latin-1 Supplement', () => {
    expect(charDisplayWidth('é')).toBe(1);
    expect(charDisplayWidth('ñ')).toBe(1);
  });

  it('returns 1 for Cyrillic', () => {
    expect(charDisplayWidth('д')).toBe(1);
    expect(charDisplayWidth('ж')).toBe(1);
  });
});

describe('stringDisplayWidth', () => {
  it('returns 0 for empty string', () => {
    expect(stringDisplayWidth('')).toBe(0);
  });

  it('calculates width for ASCII string', () => {
    expect(stringDisplayWidth('hello')).toBe(5);
    expect(stringDisplayWidth('abc def')).toBe(7);
  });

  it('calculates width for mixed ASCII and CJK', () => {
    expect(stringDisplayWidth('你好')).toBe(4);
    expect(stringDisplayWidth('Hello世界')).toBe(9); // 5 + 2*2
  });

  it('excludes control characters from width', () => {
    expect(stringDisplayWidth('a\tb\nc')).toBe(3);
  });

  it('calculates width for emoji', () => {
    expect(stringDisplayWidth('🎉🎊')).toBe(4);
  });

  it('calculates width for mixed content', () => {
    expect(stringDisplayWidth('Test中文🎉')).toBe(10); // 4 + 4 + 2
  });
});

describe('truncateToWidth', () => {
  it('returns full string when within width', () => {
    expect(truncateToWidth('hello', 10)).toBe('hello');
  });

  it('returns full string when exactly at width', () => {
    expect(truncateToWidth('hello', 5)).toBe('hello');
  });

  it('truncates ASCII string', () => {
    expect(truncateToWidth('hello world', 5)).toBe('hello');
  });

  it('truncates at CJK boundary', () => {
    expect(truncateToWidth('你好世界', 4)).toBe('你好'); // 2+2=4, cannot fit 世
    expect(truncateToWidth('你好世界', 2)).toBe('你');
  });

  it('truncates mixed string correctly', () => {
    expect(truncateToWidth('Hello世界', 7)).toBe('Hello世'); // 5 + 2 = 7
    expect(truncateToWidth('Hello世界', 6)).toBe('Hello'); // Cannot fit 世 (needs 2, only 1 left)
  });

  it('returns empty string for width 0', () => {
    expect(truncateToWidth('hello', 0)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(truncateToWidth('', 5)).toBe('');
  });

  it('handles emoji width in string', () => {
    expect(stringDisplayWidth('🎉')).toBe(2);
    expect(stringDisplayWidth('ab🎉')).toBe(4); // 1 + 1 + 2
  });
});
