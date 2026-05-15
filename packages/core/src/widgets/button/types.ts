import type {TuiColor} from '../../utils/color';
import type {TuiSizeValue, TuiBorderStyleName} from '../types';

export type ButtonWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  value?: string;

  // Normal state
  colorFgNormal?: TuiColor;
  colorBgNormal?: TuiColor;
  borderColorNormal?: TuiColor;
  borderStyleNormal?: TuiBorderStyleName;

  // Focused state
  colorFgFocused?: TuiColor;
  colorBgFocused?: TuiColor;
  borderColorFocused?: TuiColor;
  borderStyleFocused?: TuiBorderStyleName;

  // Pressed state
  colorFgPressed?: TuiColor;
  colorBgPressed?: TuiColor;
  borderColorPressed?: TuiColor;
  borderStylePressed?: TuiBorderStyleName;

  // Disabled state
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;
  borderColorDisabled?: TuiColor;
  borderStyleDisabled?: TuiBorderStyleName;

  disabled?: boolean;
};
