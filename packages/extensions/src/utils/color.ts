import {withAlpha} from '@buntui/core';

/**
 * Interpolate between two RGBA colors by factor t (0.0 = from, 1.0 = to).
 * Both inputs must be 0xAARRGGBB.
 */
export function lerpRgba(from: number, to: number, t: number): number {
  const clampT = Math.max(0, Math.min(1, t));
  const fA = (from >>> 24) & 0xFF;
  const fR = (from >>> 16) & 0xFF;
  const fG = (from >>> 8) & 0xFF;
  const fB = from & 0xFF;
  const tA = (to >>> 24) & 0xFF;
  const tR = (to >>> 16) & 0xFF;
  const tG = (to >>> 8) & 0xFF;
  const tB = to & 0xFF;
  const r = Math.round(fR + ((tR - fR) * clampT));
  const g = Math.round(fG + ((tG - fG) * clampT));
  const b = Math.round(fB + ((tB - fB) * clampT));
  const a = Math.round(fA + ((tA - fA) * clampT));
  return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

/**
 * Build a lookup table of `steps` RGBA colors fading from lead to trail.
 * Index 0 is the brightest (lead), index steps-1 is the dimmest (near-bg).
 */
export function buildTrailGradient(leadRgba: number, trailRgba: number, steps: number): number[] {
  const table: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(1, steps - 1);
    const color = lerpRgba(leadRgba, trailRgba, t);
    const alpha = Math.round(255 * (1 - (t * 0.7)));
    table.push(withAlpha(color, alpha));
  }

  return table;
}
