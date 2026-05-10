import type {TuiSizeValue} from '@buntui/core';

export type VideoPlayerState = 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';

export type VideoPlayerColorScheme = {
  dotRgba: number;
  bgRgba: number;
  textRgba: number;
};

export type VideoPlayerWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  src?: string;
  audioSrc?: string;
  data?: Uint8Array;
  colorScheme?: Partial<VideoPlayerColorScheme>;
  loop?: boolean;
  threshold?: number;
  invert?: boolean;
  fps?: number;
};
