export function rgbToRgba(hexRgb: number | string): number;
export function rgbToRgba(r: number, g: number, b: number): number;
export function rgbToRgba(rgb: {r: number; g: number; b: number}): number;
export function rgbToRgba(color: number | string | {r: number; g: number; b: number}): number;
export function rgbToRgba(
  color: {r: number; g: number; b: number} | string | number,
  g?: number,
  b?: number,
): number {
  const input = typeof color === 'number' && g !== undefined && b !== undefined
    ? {r: color, g, b} as const
    : color;

  let n = Bun.color(input, 'number');
  if (n === null && typeof color === 'string') {
    n = Bun.color('#' + color, 'number');
  }

  if (n === null) {
    throw new Error('Invalid color: ' + JSON.stringify(color));
  }

  return ((n << 8) | 0xFF) >>> 0;
}

export function withAlpha(rgbaValue: number, alpha: number): number {
  const a = Math.max(0, Math.min(255, Math.round(alpha)));
  return ((rgbaValue & 0x00_FF_FF_FF) | (a << 24)) >>> 0;
}
