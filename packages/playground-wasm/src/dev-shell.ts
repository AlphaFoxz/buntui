import '@xterm/xterm/css/xterm.css';
import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import {type TuiSFCModule} from '@buntui/core';
import {createWebApp} from './web-api';

declare const BUNTUI_APP_NAME: string;

const appName: string = BUNTUI_APP_NAME;
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, unicorn/no-await-expression-member */
const App: TuiSFCModule = (await import(`./apps/${appName}/App.vue`)).default;
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, unicorn/no-await-expression-member */

const termElement: HTMLElement = document.querySelector('#terminal')!;

const term = new Terminal({
  fontFamily: 'Cascadia Code, Fira Code, SF Mono, Menlo, Consolas, Liberation Mono, Courier New, monospace',
  cursorBlink: true,
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(termElement);
fitAddon.fit();

window.addEventListener('resize', () => {
  fitAddon.fit();
});

await createWebApp(term, App, {wasmUrl: '/buntui.wasm', logLevel: 'debug'});
