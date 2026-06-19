import type {TuiColor} from '../../utils/color';
import type {TuiBorderStyleName, TuiSizeValue} from '../types';

export type SwitchWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  label?: string;
  checked?: boolean;
  disabled?: boolean;

  // Normal state
  colorFgNormal?: TuiColor;
  colorBgNormal?: TuiColor;
  colorCrossNormal?: TuiColor;
  colorCheckNormal?: TuiColor;
  colorDimNormal?: TuiColor;

  // Hovered state
  colorFgHovered?: TuiColor;
  colorBgHovered?: TuiColor;
  colorCrossHovered?: TuiColor;
  colorCheckHovered?: TuiColor;
  colorDimHovered?: TuiColor;

  // Focused state (keyboard)
  colorFgFocused?: TuiColor;
  colorBgFocused?: TuiColor;
  colorCrossFocused?: TuiColor;
  colorCheckFocused?: TuiColor;
  colorDimFocused?: TuiColor;

  // Disabled state
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;
  colorCrossDisabled?: TuiColor;
  colorCheckDisabled?: TuiColor;
  colorDimDisabled?: TuiColor;

  // Focused border
  colorBorderFocused?: TuiColor;
  borderStyleFocused?: TuiBorderStyleName;
};
