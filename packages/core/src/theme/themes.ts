import type {TuiTheme, TuiThemeBorderStyle, TuiThemeColors} from './types';

export function defineTheme(theme: TuiTheme): TuiTheme {
  return theme;
}

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

const catppuccinLatteColors: TuiThemeColors = {
  background: 0xD6_CE_D0_FF,
  surface: 0xEF_F1_F5_FF,
  surfaceHover: 0xCC_D0_DA_FF,
  surfaceFocused: 0xE6_E9_EF_FF,
  surfacePressed: 0xCC_D0_DA_FF,
  surfaceDisabled: 0xE6_E9_EF_FF,

  text: 0x4C_4F_69_FF,
  textMuted: 0x9C_A0_B0_FF,

  border: 0xCC_D0_DA_FF,
  borderFocused: 0x1E_66_F5_FF,

  accent: 0x1E_66_F5_FF,
  accentHover: 0x2A_71_F7_FF,

  selectionBg: 0xDC_8A_78_66,
  selectionFg: 0x4C_4F_69_FF,

  shadow: 0x00_00_00_00,
  scrollbar: 0x7C_7F_93_FF,
  scrollbarTrack: 0xCC_D0_DA_FF,
  progressFill: 0x1E_66_F5_FF,
  progressTrack: 0xCC_D0_DA_FF,

  success: 0x40_A0_2B_FF,
  successMuted: 0xCE_D5_0A_4D,
  danger: 0xD2_0F_39_FF,
  dangerMuted: 0xE8_6B_6A_4D,
  warning: 0xDF_8E_1D_FF,
  placeholder: 0x9C_A0_B0_FF,
};

export const catppuccinLatte: TuiTheme = defineTheme({
  name: 'catppuccin-latte',
  colors: catppuccinLatteColors,
  borderStyle: catppuccinMochaBorderStyle,
});

const nordColors: TuiThemeColors = {
  background: 0x2E_34_40_FF,
  surface: 0x3B_42_52_FF,
  surfaceHover: 0x43_4C_5E_FF,
  surfaceFocused: 0x43_4C_5E_FF,
  surfacePressed: 0x4C_56_6A_FF,
  surfaceDisabled: 0x3B_42_52_FF,

  text: 0xEC_EF_F4_FF,
  textMuted: 0xD8_DE_E9_FF,

  border: 0x4C_56_6A_FF,
  borderFocused: 0x88_C0_D0_FF,

  accent: 0x88_C0_D0_FF,
  accentHover: 0x8F_BC_BB_FF,

  selectionBg: 0x43_4C_5E_FF,
  selectionFg: 0xEC_EF_F4_FF,

  shadow: 0x00_00_00_00,
  scrollbar: 0x4C_56_6A_FF,
  scrollbarTrack: 0x3B_42_52_FF,
  progressFill: 0x88_C0_D0_FF,
  progressTrack: 0x43_4C_5E_FF,

  success: 0xA3_BE_8C_FF,
  successMuted: 0x3B_42_52_80,
  danger: 0xBF_61_6A_FF,
  dangerMuted: 0x3B_42_52_80,
  warning: 0xEB_CB_8B_FF,
  placeholder: 0xD8_DE_E9_FF,
};

export const nord: TuiTheme = defineTheme({
  name: 'nord',
  colors: nordColors,
  borderStyle: catppuccinMochaBorderStyle,
});

const highContrastColors: TuiThemeColors = {
  background: 0x00_00_00_FF,
  surface: 0x1A_1A_1A_FF,
  surfaceHover: 0x33_33_33_FF,
  surfaceFocused: 0x26_26_26_FF,
  surfacePressed: 0x40_40_40_FF,
  surfaceDisabled: 0x12_12_12_FF,

  text: 0xFF_FF_FF_FF,
  textMuted: 0xAA_AA_AA_FF,

  border: 0x80_80_80_FF,
  borderFocused: 0xFF_FF_00_FF,

  accent: 0x00_FF_FF_FF,
  accentHover: 0x80_FF_FF_FF,

  selectionBg: 0x00_55_AA_FF,
  selectionFg: 0xFF_FF_FF_FF,

  shadow: 0x00_00_00_00,
  scrollbar: 0xCC_CC_CC_FF,
  scrollbarTrack: 0x33_33_33_FF,
  progressFill: 0x00_FF_00_FF,
  progressTrack: 0x33_33_33_FF,

  success: 0x00_FF_00_FF,
  successMuted: 0x00_44_00_FF,
  danger: 0xFF_00_00_FF,
  dangerMuted: 0x44_00_00_FF,
  warning: 0xFF_FF_00_FF,
  placeholder: 0x80_80_80_FF,
};

const highContrastBorderStyle: TuiThemeBorderStyle = {
  normal: 'solid',
  focused: 'bold',
  pressed: 'bold',
  disabled: 'none',
};

export const highContrast: TuiTheme = defineTheme({
  name: 'high-contrast',
  colors: highContrastColors,
  borderStyle: highContrastBorderStyle,
});
