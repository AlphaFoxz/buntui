import type {TuiColor} from '../../utils/color';
import type {TuiBorderStyleName, TuiSizeValue} from '../types';

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  options?: SelectOption[];
  value?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;

  // Normal (closed) state
  colorFgNormal?: TuiColor;
  colorBgNormal?: TuiColor;

  // Focused state (closed, focused by keyboard)
  colorFgFocused?: TuiColor;
  colorBgFocused?: TuiColor;

  // Hovered state
  colorFgHovered?: TuiColor;
  colorBgHovered?: TuiColor;

  // Disabled
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;

  // Border
  colorBorderUnfocused?: TuiColor;
  colorBorderFocused?: TuiColor;
  colorBorderDisabled?: TuiColor;
  borderStyle?: TuiBorderStyleName;

  // Dropdown item (open state)
  colorFgItem?: TuiColor;
  colorBgItem?: TuiColor;

  // Selected item in dropdown
  colorFgItemSelected?: TuiColor;
  colorBgItemSelected?: TuiColor;

  // Hovered item in dropdown
  colorFgItemHovered?: TuiColor;
  colorBgItemHovered?: TuiColor;

  // Scrollbar
  colorScrollbar?: TuiColor;
  colorScrollbarTrack?: TuiColor;
};
