import App from '__APP_PATH__';
import {createWebApp as _createWebApp, RECOMMENDED_FONTS} from '__WEB_API_PATH__';
import type {TerminalLike} from '@buntui/core';
import type {WebAppOptions} from '__WEB_API_PATH__';

export {App, RECOMMENDED_FONTS};
export type {WebAppOptions};

export async function createWebApp(terminal: TerminalLike, options: WebAppOptions) {
  return _createWebApp(terminal, App, options);
}
