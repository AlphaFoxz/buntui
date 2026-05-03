export type TuiColor = U32 | string;

/**
 * Parse a color value to 0xRRGGBBAA (U32).
 * Accepts U32 numbers (passthrough) or CSS color strings:
 * `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb(r,g,b)`, `rgba(r,g,b,a)`, CSS named colors.
 */
export function parseColor(color: TuiColor): U32 {
  if (typeof color === 'number') return color;

  const s = color.trim();

  // Detect explicit alpha: #RRGGBBAA or rgba()
  const hasExplicitAlpha
    = /^#[0-9a-fA-F]{8}$/.test(s)
    || /^rgba\s*\(/i.test(s);

  if (hasExplicitAlpha) {
    // Bun.color drops alpha in number format, use css format to preserve it
    const css = Bun.color(s, 'css');
    if (!css) {
      throw new Error(`Invalid color: ${color}`);
    }

    const match = css.match(/^#([0-9a-f]{6})([0-9a-f]{2})$/i);
    if (match?.[1] && match[2]) {
      const rgb = Number.parseInt(match[1], 16);
      const a = Number.parseInt(match[2], 16);
      return ((rgb << 8) | a) >>> 0 as U32;
    }

    // Fallback: opaque
    const n = Bun.color(s, 'number');
    if (n === null) {
      throw new Error(`Invalid color: ${color}`);
    }

    return ((n << 8) | 0xFF) >>> 0 as U32;
  }

  // Opaque color: Bun.color returns 0x00RRGGBB, shift to 0xRRGGBBFF
  const n = Bun.color(s, 'number');
  if (n === null) {
    throw new Error(`Invalid color: ${color}`);
  }

  return ((n << 8) | 0xFF) >>> 0 as U32;
}
