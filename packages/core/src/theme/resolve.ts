import type {TuiTheme, TuiThemeBorderStyle, TuiThemeColors} from './types';
import {getTheme} from './provider';

export type ThemeToken = keyof TuiThemeColors | `border.${keyof TuiThemeBorderStyle}`;

type ResolveToken<T extends ThemeToken> = T extends `border.${string}`
  ? TuiThemeBorderStyle[keyof TuiThemeBorderStyle]
  : TuiThemeColors[keyof TuiThemeColors];

type ResolveTokens<M extends Record<string, ThemeToken>> = {
  -readonly [K in keyof M]: ResolveToken<M[K]>;
};

const BORDER_KEYS: Record<string, keyof TuiThemeBorderStyle> = {
  normal: 'normal',
  focused: 'focused',
  pressed: 'pressed',
  disabled: 'disabled',
};

export function resolveWidgetColors<M extends Record<string, ThemeToken>>(tokenMap: M): ResolveTokens<M> {
  const theme = getTheme();
  const result: Record<string, unknown> = {};

  for (const [key, token] of Object.entries(tokenMap)) {
    result[key] = resolveToken(theme, String(token));
  }

  return result as ResolveTokens<M>;
}

function resolveToken(theme: TuiTheme, token: string): unknown {
  if (token.startsWith('border.')) {
    const borderKey = BORDER_KEYS[token.slice(7)];
    if (borderKey !== undefined) {
      return theme.borderStyle[borderKey];
    }
  }

  for (const [colorKey, colorValue] of Object.entries(theme.colors)) {
    if (colorKey === token) {
      return colorValue;
    }
  }

  return undefined;
}
