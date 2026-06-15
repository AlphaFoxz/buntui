import '@xterm/xterm/css/xterm.css';
import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import {type TuiSFCModule} from '@buntui/core';
import {createWebApp} from './web-api';

declare const BUNTUI_APP_NAME: string;

const appName: string = BUNTUI_APP_NAME;
const App: TuiSFCModule = (await import(`./apps/${appName}/App.vue`)).default;

const termElement: HTMLElement = document.querySelector('#terminal');

const term = new Terminal({
  fontFamily: 'Cascadia Code, JetBrains Mono, Fira Code, monospace',
  theme: {
    background: '#1a1b26',
    foreground: '#c0caf5',
    cursor: '#c0caf5',
  },
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
