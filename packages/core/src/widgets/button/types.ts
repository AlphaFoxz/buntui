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
  colorBorderNormal?: TuiColor;
  borderStyleNormal?: TuiBorderStyleName;

  // Hovered state (mouseover)
  colorFgHovered?: TuiColor;
  colorBgHovered?: TuiColor;
  colorBorderHovered?: TuiColor;
  borderStyleHovered?: TuiBorderStyleName;

  // Focused state
  colorFgFocused?: TuiColor;
  colorBgFocused?: TuiColor;
  colorBorderFocused?: TuiColor;
  borderStyleFocused?: TuiBorderStyleName;

  // Pressed state
  colorFgPressed?: TuiColor;
  colorBgPressed?: TuiColor;
  colorBorderPressed?: TuiColor;
  borderStylePressed?: TuiBorderStyleName;

  // Disabled state
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;
  colorBorderDisabled?: TuiColor;
  borderStyleDisabled?: TuiBorderStyleName;

  disabled?: boolean;
};
