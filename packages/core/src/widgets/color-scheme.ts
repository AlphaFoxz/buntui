import {parseColor} from '../utils/color';
import {resolveBorderStyle, type TuiBorderStyleName} from './types';

export type ColorScheme<T> = {
  normal: T;
  active?: T;
  focused?: T;
  hovered?: T;
  selected?: T;
  pressed?: T;
  disabled?: T;
};

const STATE_SUFFIXES: ReadonlyArray<[string, string]> = [
  ['Normal', 'normal'],
  ['Hovered', 'hovered'],
  ['Focused', 'focused'],
  ['Selected', 'selected'],
  ['Pressed', 'pressed'],
  ['Disabled', 'disabled'],
  ['Active', 'active'],
  ['Unfocused', 'normal'],
];

const FIELD_MAP: Readonly<Record<string, string>> = {
  colorFg: 'fg',
  colorBg: 'bg',
  colorCross: 'cross',
  colorCheck: 'check',
  colorDim: 'dim',
  colorTrack: 'track',
  colorFill: 'fill',
  borderColor: 'borderColor',
};

export function applyColorSchemeUpdates(
  scheme: ColorScheme<Record<string, number | U8>>,
  resolved: Record<string, unknown>,
): void {
  const anyScheme = scheme as Record<string, Record<string, number | U8>>;
  for (const [key, value] of Object.entries(resolved)) {
    if (value === undefined) {
      continue;
    }

    for (const [suffix, stateKey] of STATE_SUFFIXES) {
      if (!key.endsWith(suffix)) {
        continue;
      }

      const prefix = key.slice(0, -suffix.length);
      const field = FIELD_MAP[prefix];
      if (field === undefined) {
        break;
      }

      const state = anyScheme[stateKey];
      if (state !== undefined) {
        state[field] = parseColor(value as number);
      }

      break;
    }

    if (key.startsWith('borderStyle')) {
      for (const [suffix, stateKey] of STATE_SUFFIXES) {
        if (!key.endsWith(suffix)) {
          continue;
        }

        const state = anyScheme[stateKey];
        if (state !== undefined && 'borderStyle' in state) {
          (state as Record<string, unknown>).borderStyle = resolveBorderStyle(value as TuiBorderStyleName);
        }

        break;
      }
    }
  }
}

export function resolveColorState<T>(
  scheme: ColorScheme<T>,
  state: {disabled: boolean; pressed?: boolean; selected?: boolean; hovered?: boolean; focused?: boolean; active?: boolean},
): T {
  if (state.disabled && scheme.disabled) {
    return scheme.disabled;
  }

  if (state.pressed && scheme.pressed) {
    return scheme.pressed;
  }

  if (state.selected && scheme.selected) {
    return scheme.selected;
  }

  if (state.hovered && scheme.hovered) {
    return scheme.hovered;
  }

  if (state.focused && scheme.focused) {
    return scheme.focused;
  }

  if (state.active && scheme.active) {
    return scheme.active;
  }

  return scheme.normal;
}
