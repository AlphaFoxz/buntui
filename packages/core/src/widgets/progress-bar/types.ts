import type {TuiColor} from '../../utils/color';
import type {TuiSizeValue} from '../types';

export type ProgressBarWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  value?: number;
  min?: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  disabled?: boolean;

  colorTrackNormal?: TuiColor;
  colorFillNormal?: TuiColor;
  colorTextNormal?: TuiColor;

  colorTrackDisabled?: TuiColor;
  colorFillDisabled?: TuiColor;
  colorTextDisabled?: TuiColor;
};
