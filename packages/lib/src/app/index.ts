import type { TuiAppOptions } from '../extern/app/types';
import TuiApp from './TuiApp';

export function createApp(options?: Partial<TuiAppOptions>) {
    return new TuiApp(options);
}

export { TuiApp };
export { TuiScene } from './TuiScene';
