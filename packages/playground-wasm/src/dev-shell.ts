/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, unicorn/no-await-expression-member -- dynamic import of Vue SFC app at top level */
import '@xterm/xterm/css/xterm.css';
import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import {type TuiSFCModule} from '@buntui/core';
import {appName, appOptions} from 'virtual:buntui-dev';
import {createWebApp, RECOMMENDED_FONTS} from './web-api';

const App: TuiSFCModule = (await import(`./apps/${appName}/App.vue`)).default;

const termElement: HTMLElement = document.querySelector('#terminal')!;

const term = new Terminal({
  fontFamily: RECOMMENDED_FONTS.join(', '),
  cursorBlink: true,
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(termElement);
fitAddon.fit();

window.addEventListener('resize', () => {
  fitAddon.fit();
});

await createWebApp(term, App, {wasmUrl: '/buntui.wasm', ...appOptions});
