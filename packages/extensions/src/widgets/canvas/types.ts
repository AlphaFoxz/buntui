import type {TuiSizeValue} from '@buntui/core';

export type CanvasCell = {
  char: number;
  fgRgba: number;
  bgRgba: number;
};

export type CanvasWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  cells?: CanvasCell[];
};
