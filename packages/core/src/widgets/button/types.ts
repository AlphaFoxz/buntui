import type {TuiColor} from '../../utils/color';

export type ButtonWidgetOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: string;

  // Normal state
  colorFgNormal?: TuiColor;
  colorBgNormal?: TuiColor;
  borderColorNormal?: TuiColor;
  borderStyleNormal?: number;

  // Focused state
  colorFgFocused?: TuiColor;
  colorBgFocused?: TuiColor;
  borderColorFocused?: TuiColor;
  borderStyleFocused?: number;

  // Pressed state
  colorFgPressed?: TuiColor;
  colorBgPressed?: TuiColor;
  borderColorPressed?: TuiColor;
  borderStylePressed?: number;

  // Disabled state
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;
  borderColorDisabled?: TuiColor;
  borderStyleDisabled?: number;

  disabled?: boolean;
};
