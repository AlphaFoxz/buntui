import type {TuiColor} from '../../utils/color';
import type {TuiBorderStyleName, TuiSizeValue} from '../types';

export type CheckboxWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  label?: string;
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;

  // Normal state
  colorFgNormal?: TuiColor;
  colorBgNormal?: TuiColor;

  // Hovered state
  colorFgHovered?: TuiColor;
  colorBgHovered?: TuiColor;

  // Focused state (keyboard)
  colorFgFocused?: TuiColor;
  colorBgFocused?: TuiColor;

  // Disabled state
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;

  // Focused border
  colorBorderFocused?: TuiColor;
  borderStyleFocused?: TuiBorderStyleName;
};
