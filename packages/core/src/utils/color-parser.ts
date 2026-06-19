const CSS_COLORS: Record<string, number> = {
  black: 0x00_00_00,
  silver: 0xC0_C0_C0,
  gray: 0x80_80_80,
  white: 0xFF_FF_FF,
  maroon: 0x80_00_00,
  red: 0xFF_00_00,
  purple: 0x80_00_80,
  fuchsia: 0xFF_00_FF,
  green: 0x00_80_00,
  lime: 0x00_FF_00,
  olive: 0x80_80_00,
  yellow: 0xFF_FF_00,
  navy: 0x00_00_80,
  blue: 0x00_00_FF,
  teal: 0x00_80_80,
  aqua: 0x00_FF_FF,
  orange: 0xFF_A5_00,
  aliceblue: 0xF0_F8_FF,
  antiquewhite: 0xFA_EB_D7,
  aquamarine: 0x7F_FF_D4,
  azure: 0xF0_FF_FF,
  beige: 0xF5_F5_DC,
  bisque: 0xFF_E4_C4,
  blanchedalmond: 0xFF_EB_CD,
  blueviolet: 0x8A_2B_E2,
  brown: 0xA5_2A_2A,
  burlywood: 0xDE_B8_87,
  cadetblue: 0x5F_9E_A0,
  chartreuse: 0x7F_FF_00,
  chocolate: 0xD2_69_1E,
  coral: 0xFF_7F_50,
  cornflowerblue: 0x64_95_ED,
  cornsilk: 0xFF_F8_DC,
  crimson: 0xDC_14_3C,
  cyan: 0x00_FF_FF,
  darkblue: 0x00_00_8B,
  darkcyan: 0x00_8B_8B,
  darkgoldenrod: 0xB8_86_0B,
  darkgray: 0xA9_A9_A9,
  darkgreen: 0x00_64_00,
  darkgrey: 0xA9_A9_A9,
  darkkhaki: 0xBD_B7_6B,
  darkmagenta: 0x8B_00_8B,
  darkolivegreen: 0x55_6B_2F,
  darkorange: 0xFF_8C_00,
  darkorchid: 0x99_32_CC,
  darkred: 0x8B_00_00,
  darksalmon: 0xE9_96_7A,
  darkseagreen: 0x8F_BC_8F,
  darkslateblue: 0x48_3D_8B,
  darkslategray: 0x2F_4F_4F,
  darkslategrey: 0x2F_4F_4F,
  darkturquoise: 0x00_CE_D1,
  darkviolet: 0x94_00_D3,
  deeppink: 0xFF_14_93,
  deepskyblue: 0x00_BF_FF,
  dimgray: 0x69_69_69,
  dimgrey: 0x69_69_69,
  dodgerblue: 0x1E_90_FF,
  firebrick: 0xB2_22_22,
  floralwhite: 0xFF_FA_F0,
  forestgreen: 0x22_8B_22,
  gainsboro: 0xDC_DC_DC,
  ghostwhite: 0xF8_F8_FF,
  gold: 0xFF_D7_00,
  goldenrod: 0xDA_A5_20,
  greenyellow: 0xAD_FF_2F,
  grey: 0x80_80_80,
  honeydew: 0xF0_FF_F0,
  hotpink: 0xFF_69_B4,
  indianred: 0xCD_5C_5C,
  indigo: 0x4B_00_82,
  ivory: 0xFF_FF_F0,
  khaki: 0xF0_E6_8C,
  lavender: 0xE6_E6_FA,
  lavenderblush: 0xFF_F0_F5,
  lawngreen: 0x7C_FC_00,
  lemonchiffon: 0xFF_FA_CD,
  lightblue: 0xAD_D8_E6,
  lightcoral: 0xF0_80_80,
  lightcyan: 0xE0_FF_FF,
  lightgoldenrodyellow: 0xFA_FA_D2,
  lightgray: 0xD3_D3_D3,
  lightgreen: 0x90_EE_90,
  lightgrey: 0xD3_D3_D3,
  lightpink: 0xFF_B6_C1,
  lightsalmon: 0xFF_A0_7A,
  lightseagreen: 0x20_B2_AA,
  lightskyblue: 0x87_CE_FA,
  lightslategray: 0x77_88_99,
  lightslategrey: 0x77_88_99,
  lightsteelblue: 0xB0_C4_DE,
  lightyellow: 0xFF_FF_E0,
  limegreen: 0x32_CD_32,
  linen: 0xFA_F0_E6,
  magenta: 0xFF_00_FF,
  mediumaquamarine: 0x66_CD_AA,
  mediumblue: 0x00_00_CD,
  mediumorchid: 0xBA_55_D3,
  mediumpurple: 0x93_70_DB,
  mediumseagreen: 0x3C_B3_71,
  mediumslateblue: 0x7B_68_EE,
  mediumspringgreen: 0x00_FA_9A,
  mediumturquoise: 0x48_D1_CC,
  mediumvioletred: 0xC7_15_85,
  midnightblue: 0x19_19_70,
  mintcream: 0xF5_FF_FA,
  mistyrose: 0xFF_E4_E1,
  moccasin: 0xFF_E4_B5,
  navajowhite: 0xFF_DE_AD,
  oldlace: 0xFD_F5_E6,
  olivedrab: 0x6B_8E_23,
  orangered: 0xFF_45_00,
  orchid: 0xDA_70_D6,
  palegoldenrod: 0xEE_E8_AA,
  palegreen: 0x98_FB_98,
  paleturquoise: 0xAF_EE_EE,
  palevioletred: 0xDB_70_93,
  papayawhip: 0xFF_EF_D5,
  peachpuff: 0xFF_DA_B9,
  peru: 0xCD_85_3F,
  pink: 0xFF_C0_CB,
  plum: 0xDD_A0_DD,
  powderblue: 0xB0_E0_E6,
  rosybrown: 0xBC_8F_8F,
  royalblue: 0x41_69_E1,
  saddlebrown: 0x8B_45_13,
  salmon: 0xFA_80_72,
  sandybrown: 0xF4_A4_60,
  seagreen: 0x2E_8B_57,
  seashell: 0xFF_F5_EE,
  sienna: 0xA0_52_2D,
  skyblue: 0x87_CE_EB,
  slateblue: 0x6A_5A_CD,
  slategray: 0x70_80_90,
  slategrey: 0x70_80_90,
  snow: 0xFF_FA_FA,
  springgreen: 0x00_FF_7F,
  steelblue: 0x46_82_B4,
  tan: 0xD2_B4_8C,
  thistle: 0xD8_BF_D8,
  tomato: 0xFF_63_47,
  turquoise: 0x40_E0_D0,
  violet: 0xEE_82_EE,
  wheat: 0xF5_DE_B3,
  whitesmoke: 0xF5_F5_F5,
  yellowgreen: 0x9A_CD_32,
};

const REG_RGB = /^rgb\(\s*(?<r>\d{1,3})\s*,\s*(?<g>\d{1,3})\s*,\s*(?<b>\d{1,3})\s*\)$/iv;
const REG_RGBA = /^rgba\(\s*(?<r>\d{1,3})\s*,\s*(?<g>\d{1,3})\s*,\s*(?<b>\d{1,3})\s*,\s*(?<alpha>[01]?\.?\d+)\s*\)$/iv;
const REG_HEX3 = /^#(?<r>[\da-f])(?<g>[\da-f])(?<b>[\da-f])$/iv;
const REG_HEX6 = /^#(?<rgb>[\da-f]{6})$/iv;
const REG_HEX8 = /^#(?<rgb>[\da-f]{6})(?<alpha>[\da-f]{2})$/iv;

function parseRgbChannels(r: string, g: string, b: string): number | undefined {
  const rv = Number.parseInt(r, 10);
  const gv = Number.parseInt(g, 10);
  const bv = Number.parseInt(b, 10);
  if (rv > 255 || gv > 255 || bv > 255) {
    return undefined;
  }

  return (rv << 16) | (gv << 8) | bv;
}

function normalizeToHex(color: string): number | undefined {
  const s = color.trim();

  if (s.startsWith('#')) {
    const m8 = REG_HEX8.exec(s);
    if (m8?.groups) {
      const rgb = Number.parseInt(m8.groups.rgb!, 16);
      const a = Number.parseInt(m8.groups.alpha!, 16);
      return (rgb << 8) | a;
    }

    const m6 = REG_HEX6.exec(s);
    if (m6?.groups) {
      return (Number.parseInt(m6.groups.rgb!, 16) << 8) | 0xFF;
    }

    const m3 = REG_HEX3.exec(s);
    if (m3?.groups) {
      const r = Number.parseInt(m3.groups.r!, 16);
      const g = Number.parseInt(m3.groups.g!, 16);
      const b = Number.parseInt(m3.groups.b!, 16);
      // eslint-disable-next-line @stylistic/no-mixed-operators
      const rgb = ((r << 4 | r) << 16) | ((g << 4 | g) << 8) | (b << 4 | b);
      return (rgb << 8) | 0xFF;
    }

    return undefined;
  }

  const mRgba = REG_RGBA.exec(s);
  if (mRgba?.groups) {
    const rgb = parseRgbChannels(mRgba.groups.r!, mRgba.groups.g!, mRgba.groups.b!);
    if (rgb === undefined) {
      return undefined;
    }

    const aFloat = Number.parseFloat(mRgba.groups.alpha!);
    const a = Math.round(aFloat * 255);
    return (rgb << 8) | a;
  }

  const mRgb = REG_RGB.exec(s);
  if (mRgb?.groups) {
    const rgb = parseRgbChannels(mRgb.groups.r!, mRgb.groups.g!, mRgb.groups.b!);
    if (rgb === undefined) {
      return undefined;
    }

    return (rgb << 8) | 0xFF;
  }

  const lower = s.toLowerCase();
  if (lower === 'none' || lower === 'transparent') {
    return 0x00_00_00_00;
  }

  const named = CSS_COLORS[lower];
  if (named !== undefined) {
    return (named << 8) | 0xFF;
  }

  return undefined;
}

export function colorToNumber(color: string): number | undefined {
  return normalizeToHex(color);
}
