import type {TuiPercent, TuiSizeValue, TuiWidgetPercentSpec} from '../widgets/types';

const PERCENT_REGEX = /^\d+(?:\.\d+)?%$/v;

export function isPercent(value: unknown): value is TuiPercent {
  return typeof value === 'string' && PERCENT_REGEX.test(value);
}

export function resolvePercent(value: TuiPercent, total: number): number {
  const pct = Number.parseFloat(value);
  return Math.max(0, Math.floor(pct / 100 * total));
}

export function extractPercentSpec(
  x?: TuiSizeValue,
  y?: TuiSizeValue,
  width?: TuiSizeValue,
  height?: TuiSizeValue,
): TuiWidgetPercentSpec | undefined {
  const spec: TuiWidgetPercentSpec = {
    ...(isPercent(x) && {x}),
    ...(isPercent(y) && {y}),
    ...(isPercent(width) && {width}),
    ...(isPercent(height) && {height}),
  };

  return spec.x === undefined && spec.y === undefined && spec.width === undefined && spec.height === undefined ? undefined : spec;
}

export function resolveSizeValue(value: TuiSizeValue | undefined, total: number, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  return isPercent(value) ? resolvePercent(value, total) : value;
}
