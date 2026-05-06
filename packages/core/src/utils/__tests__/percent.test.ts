import {describe, it, expect} from 'bun:test';
import {isPercent, resolvePercent, extractPercentSpec, resolveSizeValue} from '../percent';

describe('isPercent', () => {
  it('returns true for valid percent strings', () => {
    expect(isPercent('50%')).toBe(true);
    expect(isPercent('100%')).toBe(true);
    expect(isPercent('0%')).toBe(true);
    expect(isPercent('33.3%')).toBe(true);
  });

  it('returns false for non-percent values', () => {
    expect(isPercent(50)).toBe(false);
    expect(isPercent('50')).toBe(false);
    expect(isPercent('abc')).toBe(false);
    expect(isPercent(undefined)).toBe(false);
    expect(isPercent('')).toBe(false);
  });
});

describe('resolvePercent', () => {
  it('resolves percentage to absolute value', () => {
    expect(resolvePercent('50%', 100)).toBe(50);
    expect(resolvePercent('50%', 80)).toBe(40);
    expect(resolvePercent('100%', 200)).toBe(200);
    expect(resolvePercent('0%', 200)).toBe(0);
  });

  it('floors fractional results', () => {
    expect(resolvePercent('33.3%', 99)).toBe(32);
  });

  it('clamps to 0 minimum', () => {
    expect(resolvePercent('50%', 0)).toBe(0);
  });
});

describe('extractPercentSpec', () => {
  it('returns undefined when no percent values', () => {
    expect(extractPercentSpec(0, 0, 32, 3)).toBeUndefined();
    expect(extractPercentSpec()).toBeUndefined();
  });

  it('returns spec with only percent fields', () => {
    expect(extractPercentSpec(0, '50%', 32, '25%')).toEqual({
      y: '50%',
      height: '25%',
    });
  });

  it('returns spec when all values are percent', () => {
    expect(extractPercentSpec('10%', '20%', '50%', '100%')).toEqual({
      x: '10%',
      y: '20%',
      width: '50%',
      height: '100%',
    });
  });
});

describe('resolveSizeValue', () => {
  it('returns fallback for undefined', () => {
    expect(resolveSizeValue(undefined, 100, 50)).toBe(50);
  });

  it('resolves percent values', () => {
    expect(resolveSizeValue('50%', 100, 0)).toBe(50);
  });

  it('passes through absolute numbers', () => {
    expect(resolveSizeValue(42, 100, 0)).toBe(42);
  });
});
