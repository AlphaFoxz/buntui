import type {TuiWidgetEntity} from '../widgets/TuiWidgetEntity';
import type {TuiTheme, TuiThemeBorderStyle, TuiThemeColors} from './types';
import {getTheme, onThemeChange} from './provider';

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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return result as ResolveTokens<M>;
}

function resolveToken(theme: TuiTheme, token: string): unknown {
  if (token.startsWith('border.')) {
    const borderKey = BORDER_KEYS[token.slice(7)];
    if (borderKey !== undefined) {
      return theme.borderStyle[borderKey];
    }

    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return theme.colors[token as keyof TuiThemeColors];
}

export function bindThemeToWidget<M extends Record<string, ThemeToken>>(
  widget: TuiWidgetEntity,
  tokenMap: M,
  userOverrides: Record<string, unknown>,
  apply: (resolved: Record<string, unknown>) => void,
): void {
  const tracked = Object.fromEntries(Object.entries(tokenMap).filter(([key]) => userOverrides[key] === undefined));

  if (Object.keys(tracked).length === 0) {
    return;
  }

  const unsub = onThemeChange(theme => {
    const resolved: Record<string, unknown> = {};
    for (const [key, token] of Object.entries(tracked)) {
      resolved[key] = resolveToken(theme, String(token));
    }

    apply(resolved);
  });

  widget.addCleanup(unsub);
}
