import type {TerminalLike, TuiApp, TuiSFCModule} from '@buntui/core';
import type {WebAppOptions} from '__WEB_API_DTS_PATH__';

declare const App: TuiSFCModule;
declare function createWebApp(terminal: TerminalLike, options: WebAppOptions): Promise<TuiApp>;
export {App, createWebApp};
export type {WebAppOptions};
export {RECOMMENDED_FONTS} from '__WEB_API_DTS_PATH__';
