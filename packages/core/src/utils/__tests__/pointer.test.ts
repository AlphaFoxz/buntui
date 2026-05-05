import {it, expect, describe} from 'bun:test';
import {ptrOffset, ptrFromNumber} from '../pointer';

describe('ptrOffset', () => {
  it('adds positive delta to base pointer', () => {
    const base = ptrFromNumber(100);
    const result = ptrOffset(base, 10);
    expect(Number(result)).toBe(110);
  });

  it('adds zero delta returns same pointer', () => {
    const base = ptrFromNumber(42);
    const result = ptrOffset(base, 0);
    expect(Number(result)).toBe(42);
  });

  it('handles large pointer values', () => {
    const base = ptrFromNumber(0xFFFF_FFFF);
    const result = ptrOffset(base, 1);
    expect(Number(result)).toBe(0x1_0000_0000);
  });

  it('handles zero base', () => {
    const base = ptrFromNumber(0);
    const result = ptrOffset(base, 100);
    expect(Number(result)).toBe(100);
  });
});

describe('ptrFromNumber', () => {
  it('converts number to Pointer', () => {
    const ptr = ptrFromNumber(42);
    expect(Number(ptr)).toBe(42);
  });

  it('converts zero to Pointer', () => {
    const ptr = ptrFromNumber(0);
    expect(Number(ptr)).toBe(0);
  });

  it('converts large number to Pointer', () => {
    const ptr = ptrFromNumber(0xDEAD_BEEF);
    expect(Number(ptr)).toBe(0xDEAD_BEEF);
  });

  it('converts bigint to Pointer', () => {
    const ptr = ptrFromNumber(BigInt(123));
    expect(Number(ptr)).toBe(123);
  });

  it('converts large bigint to Pointer', () => {
    const ptr = ptrFromNumber(BigInt('9007199254740991'));
    expect(Number(ptr)).toBe(9007199254740991);
  });
});
