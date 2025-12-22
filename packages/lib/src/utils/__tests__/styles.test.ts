import { it, expect } from 'bun:test';
import { rgb, rgbToRgba } from '../styles';

it('rgb', () => {
    expect(rgb('123')).toEqual(0x112233);
    expect(rgb('#123')).toEqual(0x112233);
    expect(rgb('112233')).toEqual(0x112233);
    expect(rgb('#112233')).toEqual(0x112233);
    expect(rgb(0x112233)).toEqual(0x112233);
    expect(rgb(0x11, 0x22, 0x33)).toEqual(0x112233);
    expect(rgb({ r: 0x11, g: 0x22, b: 0x33 })).toEqual(0x112233);
});

it('rgb to rgba', () => {
    expect(rgbToRgba('123')).toEqual(0x112233ff);
    expect(rgbToRgba('#123')).toEqual(0x112233ff);
    expect(rgbToRgba('112233')).toEqual(0x112233ff);
    expect(rgbToRgba('#112233')).toEqual(0x112233ff);
    expect(rgbToRgba(0x112233)).toEqual(0x112233ff);
    expect(rgbToRgba(0x11, 0x22, 0x33)).toEqual(0x112233ff);
    expect(rgbToRgba({ r: 0x11, g: 0x22, b: 0x33 })).toEqual(0x112233ff);
});
