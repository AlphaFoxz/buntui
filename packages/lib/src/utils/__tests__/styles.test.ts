import {it, expect} from 'bun:test';
import {rgb, rgbToRgba} from '../styles';

it('rgb', () => {
  expect(rgb('123')).toEqual(0x11_22_33);
  expect(rgb('#123')).toEqual(0x11_22_33);
  expect(rgb('112233')).toEqual(0x11_22_33);
  expect(rgb('#112233')).toEqual(0x11_22_33);
  expect(rgb(0x11_22_33)).toEqual(0x11_22_33);
  expect(rgb(0x11, 0x22, 0x33)).toEqual(0x11_22_33);
  expect(rgb({r: 0x11, g: 0x22, b: 0x33})).toEqual(0x11_22_33);
});

it('rgb to rgba', () => {
  expect(rgbToRgba('123')).toEqual(0x11_22_33_FF);
  expect(rgbToRgba('#123')).toEqual(0x11_22_33_FF);
  expect(rgbToRgba('112233')).toEqual(0x11_22_33_FF);
  expect(rgbToRgba('#112233')).toEqual(0x11_22_33_FF);
  expect(rgbToRgba(0x11_22_33)).toEqual(0x11_22_33_FF);
  expect(rgbToRgba(0x11, 0x22, 0x33)).toEqual(0x11_22_33_FF);
  expect(rgbToRgba({r: 0x11, g: 0x22, b: 0x33})).toEqual(0x11_22_33_FF);
});

