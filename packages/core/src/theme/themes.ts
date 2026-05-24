import type {TuiTheme, TuiThemeBorderStyle, TuiThemeColors} from './types';

export function defineTheme(theme: TuiTheme): TuiTheme {
  return theme;
}

// Extracted from widget DEFAULT_*_OPTIONS — Catppuccin Mocha palette
const catppuccinMochaColors: TuiThemeColors = {
  background: 0x00_00_00_FF,
  surface: 0x1E_1E_2E_FF,
  surfaceHover: 0x45_47_5A_FF,
  surfaceFocused: 0x31_32_44_FF,
  surfacePressed: 0x45_47_5A_FF,
  surfaceDisabled: 0x18_18_25_FF,

  text: 0xFF_FF_FF_FF,
  textMuted: 0x6C_70_86_FF,

  border: 0x45_47_5A_FF,
  borderFocused: 0x89_B4_FA_FF,

  accent: 0x89_B4_FA_FF,
  accentHover: 0xB4_BE_FE_FF,

  selectionBg: 0x26_4F_78_FF,
  selectionFg: 0xFF_FF_FF_FF,

  shadow: 0x00_00_00_00,
  scrollbar: 0x58_5B_70_FF,
  scrollbarTrack: 0x31_32_44_FF,
  progressFill: 0x89_B4_FA_FF,
  progressTrack: 0x31_32_44_FF,

  success: 0xA6_E3_A1_FF,
  successMuted: 0x2B_4A_2E_FF,
  danger: 0xF3_8B_A8_FF,
  dangerMuted: 0x4A_2B_30_FF,
  warning: 0xF9_E2_AF_FF,
  placeholder: 0x6C_70_86_FF,
};

const catppuccinMochaBorderStyle: TuiThemeBorderStyle = {
  normal: 'solid',
  focused: 'solid',
  pressed: 'bold',
  disabled: 'dashed',
};

export const catppuccinMocha: TuiTheme = defineTheme({
  name: 'catppuccin-mocha',
  colors: catppuccinMochaColors,
  borderStyle: catppuccinMochaBorderStyle,
});
