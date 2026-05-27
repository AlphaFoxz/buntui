import {createApp} from '@buntui/core';
import App from './App.vue';

export const ENTRY = 'App.vue';

export function run() {
  const app = createApp({logLevel: 'info', clearLog: true, tickRate: 120, renderRate: 60});
  const scene = app.createScene(App, {bgHexRgb: 0x1A_1B_26, visible: true});
  app.start();
  return {app, scene};
}

if (import.meta.main) {
  run();
}
