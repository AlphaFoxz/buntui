import {rgbToRgba} from '@buntui/core';
import type {VideoPlayerColorScheme, VideoPlayerWidgetOptions} from './types';

export const DEFAULT_VIDEOPLAYER_COLOR_SCHEME: VideoPlayerColorScheme = {
  dotRgba: rgbToRgba(0xFF, 0xFF, 0xFF),
  bgRgba: rgbToRgba(0x00, 0x00, 0x00),
  textRgba: rgbToRgba(0x88, 0x88, 0x88),
};

export const DEFAULT_VIDEOPLAYER_OPTIONS: VideoPlayerWidgetOptions = {
  x: 0,
  y: 0,
  width: '100%',
  height: '100%',
  colorScheme: DEFAULT_VIDEOPLAYER_COLOR_SCHEME,
  loop: false,
  threshold: 128,
  invert: false,
  fps: 30,
};
