import {type TuiAppOptions} from '../extern/app/types';
import {type TuiBackend} from './TuiBackend';
import TuiApp from './TuiApp';

export type CreateAppOptions = Partial<TuiAppOptions> & {backend?: TuiBackend};

export function createApp(options?: CreateAppOptions) {
  return new TuiApp(options);
}

export {default as TuiApp} from './TuiApp';
