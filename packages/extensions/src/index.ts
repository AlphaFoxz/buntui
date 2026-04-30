// eslint-disable-next-line import-x/newline-after-import -- re-export syntax triggers Bun bundler bug (skips file resolution)
import {MatrixWidget, createMatrixWidget} from './widgets/matrix/MatrixWidget';
export {MatrixWidget, createMatrixWidget};

export type {
  MatrixWidgetOptions,
  MatrixColorScheme,
  MatrixSpeedRange,
} from './widgets/matrix/types';
