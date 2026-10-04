import {type TuiAppOptions} from '../extern/app/types';
import {type TuiBackend} from './TuiBackend';
import TuiApp from './TuiApp';

export type CreateAppOptions = Partial<TuiAppOptions> & {backend?: TuiBackend};

export function createApp(options?: CreateAppOptions) {
  return new TuiApp(options);
}

export {default as TuiApp} from './TuiApp';
export type {TuiSFCModule} from './TuiApp';
export {defineEmits} from './define-emits';
export type {EmitFn} from './define-emits';
