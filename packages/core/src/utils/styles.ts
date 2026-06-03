import {colorToNumber} from './color-parser';

export function rgbToRgba(hexRgb: number | string): number;
export function rgbToRgba(r: number, g: number, b: number): number;
export function rgbToRgba(rgb: {r: number; g: number; b: number}): number;
export function rgbToRgba(color: number | string | {r: number; g: number; b: number}): number;
export function rgbToRgba(
  color: {r: number; g: number; b: number} | string | number,
  g?: number,
  b?: number,
): number {
  if (typeof color === 'number' && g !== undefined && b !== undefined) {
    return ((color << 24) | (g << 16) | (b << 8) | 0xFF) >>> 0;
  }

  if (typeof color === 'number') {
    return ((color << 8) | 0xFF) >>> 0;
  }

  if (typeof color === 'string') {
    const n = colorToNumber(color) ?? colorToNumber('#' + color);
    if (n === undefined) {
      throw new Error('Invalid color: ' + JSON.stringify(color));
    }

    return (((n >>> 8) << 8) | 0xFF) >>> 0;
  }

  const {r, g: gv, b: bv} = color;
  return ((r << 24) | (gv << 16) | (bv << 8) | 0xFF) >>> 0;
}

export function withAlpha(rgbaValue: number, alpha: number): number {
  const a = Math.max(0, Math.min(255, Math.round(alpha)));
  return ((rgbaValue & 0x00_FF_FF_FF) | (a << 24)) >>> 0;
}
