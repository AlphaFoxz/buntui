/* eslint-disable @stylistic/no-mixed-operators */
type OklchColor = {
  l: number;
  c: number;
  h: number;
};

type RgbLinear = {
  r: number;
  g: number;
  b: number;
};

const M_LMS: ReadonlyArray<readonly number[]> = [
  [0.412_221_470_8, 0.536_332_536_3, 0.051_445_992_9],
  [0.211_903_498_2, 0.680_699_545_1, 0.107_396_956_6],
  [0.088_302_461_9, 0.281_718_837_6, 0.629_978_700_5],
];

const M_OKLAB: ReadonlyArray<readonly number[]> = [
  [0.210_454_255_3, 0.793_617_785, -0.004_072_046_8],
  [1.977_998_495_1, -2.428_592_205, 0.450_593_709_9],
  [0.025_904_037_1, 0.782_771_766_2, -0.808_675_766],
];

const M_OKLAB_INV: ReadonlyArray<readonly number[]> = [
  [1, 0.396_337_777_4, 0.215_803_757_3],
  [1, -0.105_561_345_8, -0.063_854_172_8],
  [1, -0.089_484_177_5, -1.291_485_548],
];

const M_LMS_INV: ReadonlyArray<readonly number[]> = [
  [4.076_741_662_1, -3.307_711_591_3, 0.230_969_929_2],
  [-1.268_438_004_6, 2.609_757_401_1, -0.341_319_396_5],
  [-0.004_196_086_3, -0.703_418_614_7, 1.707_614_701],
];

function srgbToLinear(c: number): number {
  return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  return c <= 0.003_130_8 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function cuberoot(x: number): number {
  return x < 0 ? -((-x) ** (1 / 3)) : x ** (1 / 3);
}

function mul3(m: ReadonlyArray<readonly number[]>, a: number, b: number, c: number): [number, number, number] {
  return [
    m[0]![0]! * a + m[0]![1]! * b + m[0]![2]! * c,
    m[1]![0]! * a + m[1]![1]! * b + m[1]![2]! * c,
    m[2]![0]! * a + m[2]![1]! * b + m[2]![2]! * c,
  ];
}

export function rgbToOklch(r: number, g: number, b: number): OklchColor {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const [lv, mv, sv] = mul3(M_LMS, lr, lg, lb);
  const l_ = cuberoot(lv);
  const m_ = cuberoot(mv);
  const s_ = cuberoot(sv);

  const [L, a, bValue] = mul3(M_OKLAB, l_, m_, s_);

  const C = Math.hypot(a, bValue);
  let H = Math.atan2(bValue, a) * 180 / Math.PI;
  if (H < 0) {
    H += 360;
  }

  return {l: L, c: C, h: H};
}

function oklchToRgbLinear(l: number, c: number, h: number): RgbLinear {
  const hRad = h * Math.PI / 180;
  const a = c * Math.cos(hRad);
  const bValue = c * Math.sin(hRad);

  const [l_, m_, s_] = mul3(M_OKLAB_INV, l, a, bValue);
  const lv = l_ * l_ * l_;
  const mv = m_ * m_ * m_;
  const sv = s_ * s_ * s_;

  const [r, g, b] = mul3(M_LMS_INV, lv, mv, sv);
  return {r, g, b};
}

function isInGamut(r: number, g: number, b: number): boolean {
  const eps = -0.001;
  return r >= eps && r <= 1 + eps && g >= eps && g <= 1 + eps && b >= eps && b <= 1 + eps;
}

function clipGamut(l: number, c: number, h: number): RgbLinear {
  let lo = 0;
  let hi = c;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const rgb = oklchToRgbLinear(l, mid, h);
    if (isInGamut(rgb.r, rgb.g, rgb.b)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const rgb = oklchToRgbLinear(l, lo, h);
  return {
    r: Math.max(0, Math.min(1, rgb.r)),
    g: Math.max(0, Math.min(1, rgb.g)),
    b: Math.max(0, Math.min(1, rgb.b)),
  };
}

export function oklchToRgb(l: number, c: number, h: number): {r: number; g: number; b: number} {
  const rgb = oklchToRgbLinear(l, c, h);
  if (isInGamut(rgb.r, rgb.g, rgb.b)) {
    return {
      r: Math.round(linearToSrgb(Math.max(0, Math.min(1, rgb.r))) * 255),
      g: Math.round(linearToSrgb(Math.max(0, Math.min(1, rgb.g))) * 255),
      b: Math.round(linearToSrgb(Math.max(0, Math.min(1, rgb.b))) * 255),
    };
  }

  const clipped = clipGamut(l, c, h);
  return {
    r: Math.round(linearToSrgb(clipped.r) * 255),
    g: Math.round(linearToSrgb(clipped.g) * 255),
    b: Math.round(linearToSrgb(clipped.b) * 255),
  };
}
