/* eslint-disable @stylistic/no-mixed-operators -- OKLCH color math extensively mixes arithmetic operators */
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
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];

const M_OKLAB: ReadonlyArray<readonly number[]> = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
];

const M_OKLAB_INV: ReadonlyArray<readonly number[]> = [
  [1, 0.3963377774, 0.2158037573],
  [1, -0.1055613458, -0.0638541728],
  [1, -0.0894841775, -1.291485548],
];

const M_LMS_INV: ReadonlyArray<readonly number[]> = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
];

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function cuberoot(x: number): number {
  return x < 0 ? -((-x) ** (1 / 3)) : x ** (1 / 3);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
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
    r: clamp01(rgb.r),
    g: clamp01(rgb.g),
    b: clamp01(rgb.b),
  };
}

export function oklchToRgb(l: number, c: number, h: number): {r: number; g: number; b: number} {
  const rgb = oklchToRgbLinear(l, c, h);
  if (isInGamut(rgb.r, rgb.g, rgb.b)) {
    return {
      r: Math.round(linearToSrgb(clamp01(rgb.r)) * 255),
      g: Math.round(linearToSrgb(clamp01(rgb.g)) * 255),
      b: Math.round(linearToSrgb(clamp01(rgb.b)) * 255),
    };
  }

  const clipped = clipGamut(l, c, h);
  return {
    r: Math.round(linearToSrgb(clipped.r) * 255),
    g: Math.round(linearToSrgb(clipped.g) * 255),
    b: Math.round(linearToSrgb(clipped.b) * 255),
  };
}
