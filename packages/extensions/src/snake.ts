export type {
	SnakeWidgetOptions,
	SnakeDirection,
	SnakeGameState,
	SnakePoint,
	SnakeColorScheme,
} from './widgets/snake/types';

export {SnakeWidget, createSnakeWidget} from './widgets/snake/SnakeWidget';

// Default export = creator function, for SFC default import usage:
//   import Snake from '@buntui/extensions/snake'
export {createSnakeWidget as default} from './widgets/snake/SnakeWidget';
