import type {TuiColor} from '../../utils/color';

export type SwitchWidgetOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
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
};
