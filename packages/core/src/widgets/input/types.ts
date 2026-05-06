import type {TuiColor} from '../../utils/color';
import type {TuiSizeValue} from '../types';

export type InputWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  colorFg?: TuiColor;
  colorBg?: TuiColor;
  placeholder?: string;
  value?: string;
  borderColorUnfocused?: TuiColor;
  borderColorFocused?: TuiColor;
  borderStyle?: number;
  maxLength?: number;
  selectionBgColor?: TuiColor;
  selectionFgColor?: TuiColor;
  label?: string;
  readonly?: boolean;
};
