import type {TuiSizeValue} from '@buntui/core';

export type MatrixColorScheme = {
  /** RGBA color for the bright lead character (default: bright green) */
  leadRgba: number;
  /** RGBA color for the trail characters (default: medium green) */
  trailRgba: number;
  /** RGBA background behind everything (default: opaque black) */
  bgRgba: number;
};

export type MatrixSpeedRange = {
  /** Minimum column speed in cells-per-frame */
  min: number;
  /** Maximum column speed in cells-per-frame */
  max: number;
};

export type MatrixWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;
  /** Color scheme overrides. Partially applied over defaults. */
  colorScheme?: Partial<MatrixColorScheme>;
  /** Speed range for column falls (default: {min:1, max:3}) */
  speedRange?: MatrixSpeedRange;
  /** Minimum trail length (default: 5) */
  minTrailLength?: number;
  /** Maximum trail length (default: 20) */
  maxTrailLength?: number;
  /** Character density: 0.0-1.0 fraction of active columns (default: 0.8) */
  density?: number;
  /** Custom character set. Array of code points. Overrides built-in sets. */
  charset?: number[];
};
