import {it, expect, describe} from 'bun:test';
import {colorThemed, isThemedColorRef, resolveThemedColor, resolveThemedColorFromTheme, resolveThemedOverrides} from '../themed-color';
import {getTheme, setTheme} from '../provider';
import {tokyoNightMoon, tokyoNightStorm} from '../themes';
import {parseColor} from '../../utils/color';

describe('colorThemed', () => {
  it('returns undefined for no options', () => {
    expect(colorThemed()).toBeUndefined();
  });

  it('returns undefined for empty options', () => {
    expect(colorThemed({})).toBeUndefined();
  });

  it('returns ref when alpha is specified', () => {
    const ref = colorThemed({alpha: 0.5});
    expect(ref).not.toBeUndefined();
    expect(isThemedColorRef(ref)).toBe(true);
  });

  it('returns ref when token is specified', () => {
    const ref = colorThemed({token: 'surface'});
    expect(ref).not.toBeUndefined();
    expect(isThemedColorRef(ref)).toBe(true);
  });

  it('returns ref with all OKLCH transforms', () => {
    const ref = colorThemed({lightnessOffset: 0.1, chromaOffset: 0.05, hueOffset: 30, alpha: 0.8});
    expect(ref).not.toBeUndefined();
    expect(isThemedColorRef(ref)).toBe(true);
  });
});

describe('isThemedColorRef', () => {
  it('returns false for plain objects', () => {
    expect(isThemedColorRef({})).toBe(false);
    expect(isThemedColorRef({alpha: 0.5})).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isThemedColorRef(42)).toBe(false);
    expect(isThemedColorRef('red')).toBe(false);
    expect(isThemedColorRef(null)).toBe(false);
    expect(isThemedColorRef(undefined)).toBe(false);
  });

  it('returns true for colorThemed() result', () => {
    const ref = colorThemed({alpha: 0.5});
    expect(isThemedColorRef(ref)).toBe(true);
  });
});

describe('resolveThemedColor', () => {
  it('resolves with explicit token', () => {
    const ref = colorThemed({token: 'surface', alpha: 0.5})!;
    const result = resolveThemedColor(ref);
    const baseRgba = parseColor(getTheme().colors.surface);
    const expectedAlpha = 128;
    expect((result >>> 24) & 0xFF).toBe((baseRgba >>> 24) & 0xFF);
    expect((result >>> 16) & 0xFF).toBe((baseRgba >>> 16) & 0xFF);
    expect((result >>> 8) & 0xFF).toBe((baseRgba >>> 8) & 0xFF);
    expect(result & 0xFF).toBe(expectedAlpha);
  });

  it('resolves with default token', () => {
    const ref = colorThemed({alpha: 1})!;
    const result = resolveThemedColor(ref, 'text');
    const expected = parseColor(getTheme().colors.text);
    expect(result).toBe(expected);
  });

  it('throws when no token available', () => {
    const ref = colorThemed({alpha: 0.5})!;
    expect(() => resolveThemedColor(ref)).toThrow('token is required');
  });

  it('applies OKLCH lightness offset', () => {
    const ref = colorThemed({token: 'surface', lightnessOffset: 0.2})!;
    const result = resolveThemedColor(ref);
    const baseRgba = parseColor(getTheme().colors.surface);
    expect(result).not.toBe(baseRgba);
  });
});

describe('resolveThemedColorFromTheme', () => {
  it('resolves using explicit theme', () => {
    const theme = tokyoNightStorm;
    const ref = colorThemed({alpha: 0.5})!;
    const result = resolveThemedColorFromTheme(theme, ref, 'surface');
    const baseRgba = parseColor(theme.colors.surface);
    expect((result >>> 24) & 0xFF).toBe((baseRgba >>> 24) & 0xFF);
    expect(result & 0xFF).toBe(128);
  });
});

describe('resolveThemedOverrides', () => {
  it('passes through non-themed values unchanged', () => {
    const opts = {colorFg: '#FF0000', colorBg: 0x00_FF_00_FF};
    const tokenMap = {colorFg: 'text', colorBg: 'background'};
    const result = resolveThemedOverrides(opts, tokenMap);
    expect(result.colorFg).toBe('#FF0000');
    expect(result.colorBg).toBe(0x00_FF_00_FF);
  });

  it('resolves themed refs using token map', () => {
    const ref = colorThemed({alpha: 0.5})!;
    const opts = {colorBg: ref};
    const tokenMap = {colorBg: 'background'};
    const result = resolveThemedOverrides(opts, tokenMap);
    expect(typeof result.colorBg).toBe('number');
    expect((result.colorBg as number) & 0xFF).toBe(128);
  });

  it('skips border.* tokens', () => {
    const ref = colorThemed({alpha: 0.5})!;
    const opts = {borderStyleNormal: ref};
    const tokenMap = {borderStyleNormal: 'border.normal'};
    const result = resolveThemedOverrides(opts, tokenMap);
    expect(result.borderStyleNormal).toBe(ref);
  });
});

describe('parseColor with TuiThemedColorRef', () => {
  it('handles colorThemed with explicit token', () => {
    const ref = colorThemed({token: 'text', alpha: 0.5})!;
    const result = parseColor(ref);
    expect(typeof result).toBe('number');
    expect(result & 0xFF).toBe(128);
  });

  it('throws for colorThemed without token', () => {
    const ref = colorThemed({alpha: 0.5})!;
    expect(() => parseColor(ref)).toThrow();
  });
});

describe('theme reactivity with colorThemed', () => {
  it('themed refs are tracked on theme change', () => {
    setTheme(tokyoNightMoon);
    const ref = colorThemed({token: 'background', lightnessOffset: 0.1})!;
    const moonResult = resolveThemedColor(ref);

    setTheme(tokyoNightStorm);
    const stormResult = resolveThemedColor(ref);

    expect(moonResult).not.toBe(stormResult);

    setTheme(tokyoNightMoon);
  });
});

describe('widget _resolveColorValue', () => {
  it('resolves themed ref via updateColor with token map', async () => {
    setTheme(tokyoNightMoon);
    const {createBox} = await import('../../widgets/box/BoxWidget');
    const ref = colorThemed({alpha: 0.7});
    const box = createBox({colorBg: ref});
    const expected = resolveThemedColor(ref!, 'background');
    expect(box.color.colorBg).toBe(expected);
    setTheme(tokyoNightMoon);
  });
});
