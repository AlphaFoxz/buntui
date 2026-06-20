
import '@xterm/xterm/css/xterm.css';
import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import {type TuiSFCModule} from '@buntui/core';
import {appName, appOptions} from 'virtual:buntui-dev';
import {createWebApp} from './web-api';

const App: TuiSFCModule = (await import(`./apps/${appName}/App.vue`)).default;

const termElement: HTMLElement = document.querySelector('#terminal');

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

await createWebApp(term, App, {wasmUrl: '/buntui.wasm', ...appOptions});
