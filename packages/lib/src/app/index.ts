import type {TuiAppOptions} from '../extern/app/types';
import TuiApp from './TuiApp';

export function createApp(options?: Partial<TuiAppOptions>) {
  return new TuiApp(options);
}

export {default as TuiApp} from './TuiApp';

