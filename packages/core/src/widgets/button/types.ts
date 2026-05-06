import type {TuiColor} from '../../utils/color';
import type {TuiSizeValue} from '../types';

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
