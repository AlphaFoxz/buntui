import type {TuiColor} from '../../utils/color';

export type ProgressBarWidgetOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  min?: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  disabled?: boolean;

  // Normal state
  colorTrackNormal?: TuiColor;
  colorFillNormal?: TuiColor;
  colorTextNormal?: TuiColor;

  // Focused state
  colorTrackFocused?: TuiColor;
  colorFillFocused?: TuiColor;
  colorTextFocused?: TuiColor;

  // Disabled state
  colorTrackDisabled?: TuiColor;
  colorFillDisabled?: TuiColor;
  colorTextDisabled?: TuiColor;
};
