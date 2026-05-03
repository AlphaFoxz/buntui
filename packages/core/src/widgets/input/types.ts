import type {TuiColor} from '../../utils/color';

export type InputWidgetOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
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
