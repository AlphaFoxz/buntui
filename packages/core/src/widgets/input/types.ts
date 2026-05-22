import type {TuiColor} from '../../utils/color';
import type {TuiSizeValue, TuiBorderStyleName} from '../types';

export type InputWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  colorFg?: TuiColor;
  colorBg?: TuiColor;
  placeholder?: string;
  placeholderColorFg?: TuiColor;
  value?: string;
  borderColorUnfocused?: TuiColor;
  borderColorFocused?: TuiColor;
  borderColorDisabled?: TuiColor;
  borderStyle?: TuiBorderStyleName;
  maxLength?: number;
  selectionBgColor?: TuiColor;
  selectionFgColor?: TuiColor;
  label?: string;
  readonly?: boolean;
  disabled?: boolean;
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;
};
