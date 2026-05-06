import type {TuiPercent, TuiSizeValue, TuiWidgetPercentSpec} from '../widgets/types';

const PERCENT_REGEX = /^\d+(\.\d+)?%$/v;

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
  const spec: TuiWidgetPercentSpec = {};
  if (isPercent(x)) {
    spec.x = x;
  }

  if (isPercent(y)) {
    spec.y = y;
  }

  if (isPercent(width)) {
    spec.width = width;
  }

  if (isPercent(height)) {
    spec.height = height;
  }

  if (spec.x === undefined && spec.y === undefined && spec.width === undefined && spec.height === undefined) {
    return undefined;
  }

  return spec;
}

export function resolveSizeValue(value: TuiSizeValue | undefined, total: number, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (isPercent(value)) {
    return resolvePercent(value, total);
  }

  return value;
}
