import {it, expect} from 'bun:test';
import {parseColor} from '../color';

it('passes through U32 numbers', () => {
  expect(parseColor(0xFF_00_00_FF)).toBe(0xFF_00_00_FF);
  expect(parseColor(0x00_00_00_00)).toBe(0x00_00_00_00);
});

it('parses #RGB shorthand', () => {
  expect(parseColor('#f00')).toBe(0xFF_00_00_FF);
  expect(parseColor('#0f0')).toBe(0x00_FF_00_FF);
  expect(parseColor('#00f')).toBe(0x00_00_FF_FF);
});

it('parses #RRGGBB', () => {
  expect(parseColor('#ff0000')).toBe(0xFF_00_00_FF);
  expect(parseColor('#00ff00')).toBe(0x00_FF_00_FF);
  expect(parseColor('#0000ff')).toBe(0x00_00_FF_FF);
});

it('parses #RRGGBBAA with alpha', () => {
  expect(parseColor('#ff000080')).toBe(0xFF_00_00_80);
  expect(parseColor('#00ff00ff')).toBe(0x00_FF_00_FF);
  expect(parseColor('#00000000')).toBe(0x00_00_00_00);
});

it('parses rgb() as opaque', () => {
  expect(parseColor('rgb(255, 0, 0)')).toBe(0xFF_00_00_FF);
  expect(parseColor('rgb(0, 255, 0)')).toBe(0x00_FF_00_FF);
});

it('parses rgba() with alpha', () => {
  expect(parseColor('rgba(255, 0, 0, 1)')).toBe(0xFF_00_00_FF);
  expect(parseColor('rgba(255, 0, 0, 0.5)')).toBe(0xFF_00_00_80);
  expect(parseColor('rgba(0, 0, 0, 0)')).toBe(0x00_00_00_00);
});

it('parses CSS named colors', () => {
  expect(parseColor('red')).toBe(0xFF_00_00_FF);
  expect(parseColor('blue')).toBe(0x00_00_FF_FF);
  expect(parseColor('black')).toBe(0x00_00_00_FF);
});

it('parses "none" and "transparent" as fully transparent', () => {
  expect(parseColor('none')).toBe(0x00_00_00_00);
  expect(parseColor('transparent')).toBe(0x00_00_00_00);
});

it('is case-insensitive for hex', () => {
  expect(parseColor('#FF00FF')).toBe(0xFF_00_FF_FF);
  expect(parseColor('#Ff00Ff')).toBe(0xFF_00_FF_FF);
  expect(parseColor('#ff00ff80')).toBe(0xFF_00_FF_80);
});

it('trims whitespace', () => {
  expect(parseColor('  #ff0000  ')).toBe(0xFF_00_00_FF);
  expect(parseColor('  red  ')).toBe(0xFF_00_00_FF);
});

it('throws on invalid color', () => {
  expect(() => parseColor('notacolor')).toThrow();
  expect(() => parseColor('#gggggg')).toThrow();
});
