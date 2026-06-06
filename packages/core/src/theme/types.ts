import type {TuiColor} from '../utils/color';
import type {TuiBorderStyleName} from '../widgets/types';

export type TuiThemeColors = {
  background: TuiColor;
  surface: TuiColor;
  surfaceHover: TuiColor;
  surfaceFocused: TuiColor;
  surfacePressed: TuiColor;
  surfaceDisabled: TuiColor;

  text: TuiColor;
  textMuted: TuiColor;

  border: TuiColor;
  borderHover: TuiColor;
  borderFocused: TuiColor;

  accent: TuiColor;
  accentHover: TuiColor;

  selectionBg: TuiColor;
  selectionFg: TuiColor;

  shadow: TuiColor;
  scrollbar: TuiColor;
  scrollbarTrack: TuiColor;
  progressFill: TuiColor;
  progressTrack: TuiColor;

  success: TuiColor;
  successMuted: TuiColor;
  danger: TuiColor;
  dangerMuted: TuiColor;
  warning: TuiColor;
  placeholder: TuiColor;
};

export type TuiThemeBorderStyle = {
  readonly normal: TuiBorderStyleName;
  readonly focused: TuiBorderStyleName;
  readonly pressed: TuiBorderStyleName;
  readonly disabled: TuiBorderStyleName;
};

export type TuiTheme = {
  readonly name: string;
  readonly colors: TuiThemeColors;
  readonly borderStyle: TuiThemeBorderStyle;
};
