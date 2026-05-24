import type {TuiColor} from '../../utils/color';
import type {TuiSizeValue, TuiBorderStyleName} from '../types';

export type TableColumn = {
  key: string;
  label?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
};

export type TableRow = Record<string, unknown>;

export type TableWidgetOptions = {
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
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;
  borderColor?: TuiColor;
  borderStyle?: TuiBorderStyleName;
  headerColorFg?: TuiColor;
  headerColorBg?: TuiColor;
  selectionBgColor?: TuiColor;
  selectionFgColor?: TuiColor;
  scrollbarColor?: TuiColor;
  scrollbarTrackColor?: TuiColor;
  columns?: TableColumn[];
  rows?: TableRow[];
  disabled?: boolean;
};
