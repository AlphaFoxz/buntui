import '@xterm/xterm/css/xterm.css';
import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import {
  createApp,
  HtmlBackend,
  WasmModule,
  animationFrameScheduler,
  type TuiSFCModule,
} from '@buntui/core';

declare const BUNTUI_APP_NAME: string;

const appName: string = BUNTUI_APP_NAME;
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, unicorn/no-await-expression-member */
const App: TuiSFCModule = (await import(`../apps/${appName}/App.vue`)).default;
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, unicorn/no-await-expression-member */

const termElement: HTMLElement = document.querySelector('#terminal')!;

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

const wasm = new WasmModule();
await wasm.load(fetch('/buntui.wasm'));

const backend = new HtmlBackend({terminal: term, wasmModule: wasm});
const app = createApp({
  backend,
  logLevel: 'debug',
  tickRate: 60,
  renderRate: 30,
  scheduler: animationFrameScheduler,
});

app.createScene(App, {visible: true});
app.start();
