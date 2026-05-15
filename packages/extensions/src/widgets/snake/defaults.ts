import {rgbToRgba} from '@buntui/core';
import type {SnakeColorScheme, SnakeWidgetOptions} from './types';

export const DEFAULT_SNAKE_COLOR_SCHEME: SnakeColorScheme = {
  headRgba: rgbToRgba(0x00, 0xFF, 0x00),
  bodyRgba: rgbToRgba(0x00, 0xAA, 0x00),
  foodRgba: rgbToRgba(0xFF, 0x55, 0x00),
  borderRgba: rgbToRgba(0x55, 0x55, 0x55),
  bgRgba: rgbToRgba(0x00, 0x00, 0x00),
  textRgba: rgbToRgba(0xFF, 0xFF, 0xFF),
  scoreTextRgba: rgbToRgba(0xFF, 0xFF, 0x00),
};

export const DEFAULT_SNAKE_OPTIONS: SnakeWidgetOptions = {
  x: 0,
  y: 0,
  width: '100%',
  height: '100%',
  colorScheme: DEFAULT_SNAKE_COLOR_SCHEME,
  tickInterval: 150,
  speedIncrement: 5,
};
