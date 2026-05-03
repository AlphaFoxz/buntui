import type {TuiColor} from '../../utils/color';

export type CheckboxWidgetOptions = {
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

  // Hovered state
  colorFgHovered?: TuiColor;
  colorBgHovered?: TuiColor;

  // Focused state (keyboard)
  colorFgFocused?: TuiColor;
  colorBgFocused?: TuiColor;

  // Disabled state
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;
};
