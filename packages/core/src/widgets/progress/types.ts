import type {TuiColor} from '../../utils/color';
import type {TuiSizeValue} from '../types';

export type ProgressWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  value?: number;
  max?: number;
  disabled?: boolean;

  colorTrackNormal?: TuiColor;
  colorFillNormal?: TuiColor;

  colorTrackDisabled?: TuiColor;
  colorFillDisabled?: TuiColor;
};
