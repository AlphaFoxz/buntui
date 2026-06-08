/* eslint-disable @stylistic/no-mixed-operators */
import {colorToNumber} from '../utils/color-parser';
import {rgbToOklch, oklchToRgb} from '../utils/oklch';
import type {TuiTheme, TuiThemeColors} from './types';
import {getTheme} from './provider';

export type TuiThemedColorRef = {
  readonly __themed: true;
  token?: keyof TuiThemeColors;
  alpha?: number;
  lightnessOffset?: number;
  chromaOffset?: number;
  hueOffset?: number;
};

export type TuiThemedColorOptions = {
  token?: keyof TuiThemeColors;
  alpha?: number;
  lightnessOffset?: number;
  chromaOffset?: number;
  hueOffset?: number;
};

export function colorThemed(options?: TuiThemedColorOptions): TuiThemedColorRef | undefined {
  if (!options) {
    return undefined;
  }

  if (options.token === undefined
    && options.alpha === undefined
    && options.lightnessOffset === undefined
    && options.chromaOffset === undefined
    && options.hueOffset === undefined) {
    return undefined;
  }

  return {__themed: true as const, ...options};
}

export function isThemedColorRef(value: unknown): value is TuiThemedColorRef {
  return typeof value === 'object' && value !== null && '__themed' in value && (value).__themed === true;
}

function tuiColorToRgba(color: unknown): number {
  if (typeof color === 'number') {
    return color >>> 0;
  }

  if (typeof color === 'string') {
    const n = colorToNumber(color.trim());
    if (n === undefined) {
      throw new Error(`Invalid theme color: ${color}`);
    }

    return n >>> 0;
  }

  throw new Error(`Invalid theme color: ${typeof color}`);
}

function applyThemedTransforms(baseRgba: number, options: TuiThemedColorOptions): number {
  const hasOklch = options.lightnessOffset !== undefined
    || options.chromaOffset !== undefined
    || options.hueOffset !== undefined;

  const r = (baseRgba >>> 24) & 0xFF;
  const g = (baseRgba >>> 16) & 0xFF;
  const b = (baseRgba >>> 8) & 0xFF;
  const baseAlpha = baseRgba & 0xFF;

  let finalR = r;
  let finalG = g;
  let finalB = b;

  if (hasOklch) {
    const oklch = rgbToOklch(r / 255, g / 255, b / 255);
    const l = Math.max(0, Math.min(1, oklch.l + (options.lightnessOffset ?? 0)));
    const c = Math.max(0, oklch.c + (options.chromaOffset ?? 0));
    const h = ((oklch.h + (options.hueOffset ?? 0)) % 360 + 360) % 360;
    const rgb = oklchToRgb(l, c, h);
    finalR = rgb.r;
    finalG = rgb.g;
    finalB = rgb.b;
  }

  const alpha = options.alpha === undefined
    ? baseAlpha
    : Math.max(0, Math.min(255, Math.round(options.alpha * 255)));

  return ((finalR << 24) | (finalG << 16) | (finalB << 8) | alpha) >>> 0;
}

export function resolveThemedColor(ref: TuiThemedColorRef, defaultToken?: keyof TuiThemeColors): number {
  const token = ref.token ?? defaultToken;
  if (!token) {
    throw new Error('colorThemed: token is required when used outside of widget props');
  }

  const theme = getTheme();
  const baseRgba = tuiColorToRgba(theme.colors[token]);
  return applyThemedTransforms(baseRgba, ref);
}

export function resolveThemedColorFromTheme(
  theme: TuiTheme,
  ref: TuiThemedColorRef,
  defaultToken: keyof TuiThemeColors,
): number {
  const token = ref.token ?? defaultToken;
  const baseRgba = tuiColorToRgba(theme.colors[token]);
  return applyThemedTransforms(baseRgba, ref);
}

export function resolveThemedOverrides<T extends Record<string, unknown>>(
  options: T,
  tokenMap: Record<string, string>,
): T {
  const result: Record<string, unknown> = {...options};
  for (const [key, token] of Object.entries(tokenMap)) {
    if (token.startsWith('border.')) {
      continue;
    }

    const value = options[key];
    if (isThemedColorRef(value)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      result[key] = resolveThemedColor(value, token as keyof TuiThemeColors);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return result as T;
}
