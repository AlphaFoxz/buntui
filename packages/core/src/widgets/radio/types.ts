import type {TuiColor} from '../../utils/color';
import type {TuiSizeValue} from '../types';

export type RadioGroupWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  options?: string[];
  value?: number;
  disabled?: boolean;

  // Normal state
  colorFgNormal?: TuiColor;
  colorBgNormal?: TuiColor;

  // Focused state
  colorFgFocused?: TuiColor;
  colorBgFocused?: TuiColor;

  // Disabled state
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;

  // Selected item highlight
  colorFgSelected?: TuiColor;
  colorBgSelected?: TuiColor;
};
