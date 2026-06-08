import {type TuiThemedColorRef, isThemedColorRef, resolveThemedColor} from '../theme/themed-color';
import {colorToNumber} from './color-parser';

export type TuiColor = U32 | string | TuiThemedColorRef;

/**
 * Parse a color value to 0xRRGGBBAA (U32).
 * Accepts U32 numbers (passthrough), CSS color strings, or TuiThemedColorRef.
 * CSS strings: `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb(r,g,b)`, `rgba(r,g,b,a)`, CSS named colors.
 */
export function parseColor(color: unknown): U32 {
  if (typeof color === 'number') {
    return color >>> 0;
  }

  if (typeof color === 'string') {
    const n = colorToNumber(color.trim());
    if (n === undefined) {
      throw new Error(`Invalid color: ${color}`);
    }

    return n >>> 0;
  }

  if (isThemedColorRef(color)) {
    return resolveThemedColor(color);
  }

  throw new Error(`Invalid color: ${typeof color}`);
}
