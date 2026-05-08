export type {
  MatrixWidgetOptions,
  MatrixColorScheme,
  MatrixSpeedRange,
} from './widgets/matrix/types';

export {MatrixWidget, createMatrixWidget} from './widgets/matrix/MatrixWidget';

// Default export = creator function, for SFC default import usage:
//   import Matrix from '@buntui/extensions/matrix'
export {createMatrixWidget as default} from './widgets/matrix/MatrixWidget';
