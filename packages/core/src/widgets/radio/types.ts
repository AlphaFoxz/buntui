import type {TuiColor} from '../../utils/color';

export type RadioGroupWidgetOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
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
