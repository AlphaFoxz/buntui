import {rgbToRgba} from '@buntui/core';
import type {MatrixColorScheme, MatrixWidgetOptions} from './types';

export const DEFAULT_MATRIX_COLOR_SCHEME: MatrixColorScheme = {
  leadRgba: rgbToRgba(0x57, 0xFF, 0x57), // Bright green
  trailRgba: rgbToRgba(0x00, 0x8F, 0x11), // Medium green
  bgRgba: rgbToRgba(0x00, 0x00, 0x00), // Black background
};

export const DEFAULT_MATRIX_OPTIONS: MatrixWidgetOptions = {
  rectX: 0,
  rectY: 0,
  rectWidth: 0,
  rectHeight: 0,
  colorScheme: DEFAULT_MATRIX_COLOR_SCHEME,
  speedRange: {min: 1, max: 3},
  minTrailLength: 5,
  maxTrailLength: 20,
  density: 0.8,
};
