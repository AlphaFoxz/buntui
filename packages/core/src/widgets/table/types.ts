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
  colorBorder?: TuiColor;
  borderStyle?: TuiBorderStyleName;
  colorHeaderFg?: TuiColor;
  colorHeaderBg?: TuiColor;
  colorSelectionBg?: TuiColor;
  colorSelectionFg?: TuiColor;
  colorScrollbar?: TuiColor;
  colorScrollbarTrack?: TuiColor;
  columns?: TableColumn[];
  rows?: TableRow[];
  disabled?: boolean;
};
