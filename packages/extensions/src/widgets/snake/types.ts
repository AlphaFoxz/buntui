import type {TuiSizeValue} from '@buntui/core';

export type SnakeDirection = 'up' | 'down' | 'left' | 'right';

export type SnakeGameState = 'idle' | 'playing' | 'gameover';

export type SnakePoint = {readonly x: number; readonly y: number};

export type SnakeColorScheme = {
  headRgba: number;
  bodyRgba: number;
  foodRgba: number;
  borderRgba: number;
  bgRgba: number;
  textRgba: number;
  scoreTextRgba: number;
};

export type SnakeWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  colorScheme?: Partial<SnakeColorScheme>;
  tickInterval?: number;
  speedIncrement?: number;
};
