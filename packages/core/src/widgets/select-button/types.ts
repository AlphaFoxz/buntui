import type {TuiColor} from '../../utils/color';

export type SelectButtonWidgetOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  options?: unknown[];
  value?: unknown;
  disabled?: boolean;

  // Normal (inactive options)
  colorFgNormal?: TuiColor;
  colorBgNormal?: TuiColor;

  // Active option (when widget not focused)
  colorFgActive?: TuiColor;
  colorBgActive?: TuiColor;

  // Active option when widget focused
  colorFgFocused?: TuiColor;
  colorBgFocused?: TuiColor;

  // Disabled
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;

  // Separator between options
  colorFgSeparator?: TuiColor;
};
