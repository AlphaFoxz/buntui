import type {TuiColor} from '../utils/color';

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

  switchCross: TuiColor;
  switchCheck: TuiColor;
  switchDim: TuiColor;
};

export type TuiThemeBorderStyle = {
  readonly normal: number;
  readonly focused: number;
  readonly pressed: number;
  readonly disabled: number;
};

export type TuiTheme = {
  readonly name: string;
  readonly colors: TuiThemeColors;
  readonly borderStyle: TuiThemeBorderStyle;
};
