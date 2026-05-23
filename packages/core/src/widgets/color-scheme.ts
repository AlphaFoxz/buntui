export type ColorScheme<T> = {
  normal: T;
  active?: T;
  focused?: T;
  hovered?: T;
  selected?: T;
  pressed?: T;
  disabled?: T;
};

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
