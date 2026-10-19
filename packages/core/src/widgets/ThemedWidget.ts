import {bindThemeToWidget, resolveThemeTokenValue, type ThemeToken} from '../theme/binding';
import {isThemedColorRef, resolveThemedColor} from '../theme/color-ref';
import type {TuiThemeColors} from '../theme/types';
import {parseColor} from '../utils/color';
import {resolveBorderStyle} from './types';
import {
  applyColorSchemeUpdates,
  FIELD_MAP,
  STATE_SUFFIXES,
  type ColorScheme,
} from './color-scheme';
import {InteractiveWidget} from './InteractiveWidget';

type ThemedColorState = Record<string, number | U8>;

export abstract class ThemedWidget<TColors extends ThemedColorState = ThemedColorState> extends InteractiveWidget {
  static readonly TOKEN_MAP: Record<string, ThemeToken> = {};

  readonly #scheme: ColorScheme<TColors>;
  readonly #resolvedTokens: Map<string, unknown>;

  constructor(userOptions: Record<string, unknown> = {}) {
    super();
    const tokenMap = (this.constructor as typeof ThemedWidget).TOKEN_MAP;
    this.#resolvedTokens = resolveTokenValues(tokenMap, userOptions);
    this.#scheme = buildColorScheme(tokenMap, this.#resolvedTokens);
    if (Object.keys(tokenMap).length === 0) {
      return;
    }

    this.initTokenMap(tokenMap);
    bindThemeToWidget(this, tokenMap, userOptions, resolved => {
      this.updateThemeColors(resolved);
    });
  }

  protected get colors(): ColorScheme<TColors> {
    return this.#scheme;
  }

  protected resolvedToken(key: string): unknown {
    return this.#resolvedTokens.get(key);
  }

  updateThemeColors(resolved: Record<string, unknown>): void {
    this.onThemeColorsUpdated(resolved);
  }

  protected onThemeColorsUpdated(resolved: Record<string, unknown>): void {
    applyColorSchemeUpdates(this.#scheme, resolved);
  }
}

function resolveTokenValues(
  tokenMap: Record<string, ThemeToken>,
  userOptions: Record<string, unknown>,
): Map<string, unknown> {
  const values = new Map<string, unknown>();
  for (const [key, token] of Object.entries(tokenMap)) {
    const raw = userOptions[key];
    const value = !token.startsWith('border.') && isThemedColorRef(raw)
      ? resolveThemedColor(raw, token as keyof TuiThemeColors)
      : (raw ?? resolveThemeTokenValue(token));
    values.set(key, value);
  }

  return values;
}

function buildColorScheme<TColors extends ThemedColorState>(
  tokenMap: Record<string, ThemeToken>,
  values: Map<string, unknown>,
): ColorScheme<TColors> {
  const scheme: Record<string, ThemedColorState> = {normal: {}};
  for (const key of Object.keys(tokenMap)) {
    const value = values.get(key);
    for (const [suffix, stateKey] of STATE_SUFFIXES) {
      if (!key.endsWith(suffix)) {
        continue;
      }

      scheme[stateKey] ??= {};
      const state = scheme[stateKey];
      if (key.startsWith('borderStyle')) {
        state.borderStyle = resolveBorderStyle(value);
      } else {
        const field = FIELD_MAP[key.slice(0, -suffix.length)];
        if (field !== undefined) {
          state[field] = parseColor(value);
        }
      }

      break;
    }
  }

  return scheme as ColorScheme<TColors>;
}
