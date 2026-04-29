import {it, expect} from 'bun:test';
import {rgbToRgba} from '../styles';

it('rgb to rgba', () => {
  expect(rgbToRgba('123')).toEqual(0x11_22_33_FF);
  expect(rgbToRgba('#123')).toEqual(0x11_22_33_FF);
  expect(rgbToRgba('112233')).toEqual(0x11_22_33_FF);
  expect(rgbToRgba('#112233')).toEqual(0x11_22_33_FF);
  expect(rgbToRgba(0x11_22_33)).toEqual(0x11_22_33_FF);
  expect(rgbToRgba(0x11, 0x22, 0x33)).toEqual(0x11_22_33_FF);
  expect(rgbToRgba({r: 0x11, g: 0x22, b: 0x33})).toEqual(0x11_22_33_FF);
});

it('rgb to rgba with css color names', () => {
  expect(rgbToRgba('red')).toEqual(0xFF_00_00_FF);
  expect(rgbToRgba('blue')).toEqual(0x00_00_FF_FF);
});

it('rgb to rgba throws on invalid input', () => {
  expect(() => rgbToRgba('notacolor')).toThrow();
});
