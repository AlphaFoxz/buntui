import type {TuiColor} from '../../utils/color';
import type {TuiSizeValue, TuiBorderStyleName} from '../types';

export type InputType = 'text' | 'password' | 'number';

export type InputWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  colorFg?: TuiColor;
  colorBg?: TuiColor;
  colorFgNormal?: TuiColor;
  colorBgNormal?: TuiColor;
  colorFgFocused?: TuiColor;
  colorBgFocused?: TuiColor;
  placeholder?: string;
  placeholderColorFg?: TuiColor;
  value?: string;
  type?: InputType;
  min?: number;
  max?: number;
  step?: number;
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
