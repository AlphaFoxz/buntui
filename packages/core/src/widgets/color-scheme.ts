export type ColorScheme<T> = {
  normal: T;
  focused?: T;
  hovered?: T;
  pressed?: T;
  disabled?: T;
};

export function resolveColorState<T>(
  scheme: ColorScheme<T>,
  state: {disabled: boolean; focused: boolean; hovered?: boolean; pressed?: boolean},
): T {
  if (state.disabled && scheme.disabled) {
    return scheme.disabled;
  }

  if (state.pressed && scheme.pressed) {
    return scheme.pressed;
  }

  if (state.hovered && scheme.hovered) {
    return scheme.hovered;
  }

  if (state.focused && scheme.focused) {
    return scheme.focused;
  }

  return scheme.normal;
}
