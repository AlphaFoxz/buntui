export type TuiColor = U32 | string;

const RE_HEX8 = /^#([\da-f]{6})([\da-f]{2})$/iv;
const RE_HEX4 = /^#([\da-f])([\da-f])([\da-f])([\da-f])$/iv;

function expandNibble(hex: string): number {
  const v = Number.parseInt(hex, 16);
  return (v << 4) | v;
}

/**
 * Parse a color value to 0xRRGGBBAA (U32).
 * Accepts U32 numbers (passthrough) or CSS color strings:
 * `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb(r,g,b)`, `rgba(r,g,b,a)`, CSS named colors.
 */
export function parseColor(color: TuiColor): U32 {
  if (typeof color === 'number') {
    return color;
  }

  const s = color.trim();

  // Try CSS format first — Bun.color normalizes alpha colors to hex
  const css = Bun.color(s, 'css');
  if (css) {
    const m8 = RE_HEX8.exec(css);
    if (m8?.[1] && m8[2]) {
      const rgb = Number.parseInt(m8[1], 16);
      const a = Number.parseInt(m8[2], 16);
      return ((rgb << 8) | a) >>> 0 as U32;
    }

    const m4 = RE_HEX4.exec(css);
    if (m4?.[1] && m4[2] && m4[3] && m4[4]) {
      const r = expandNibble(m4[1]);
      const g = expandNibble(m4[2]);
      const b = expandNibble(m4[3]);
      const a = expandNibble(m4[4]);
      return (((r << 24) | (g << 16) | (b << 8) | a) >>> 0) as U32;
    }
  }

  // Opaque color: Bun.color returns 0x00RRGGBB, shift to 0xRRGGBBFF
  const n = Bun.color(s, 'number');
  if (n === null) {
    throw new Error(`Invalid color: ${color}`);
  }

  return ((n << 8) | 0xFF) >>> 0 as U32;
}
