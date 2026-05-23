import {createApp} from '@buntui/core';
import App from './App.vue';

export const ENTRY = 'App.vue';

export function run(devOptions: {logFilePath?: string} = {}) {
  const app = createApp({
    logLevel: 'debug',
    clearLog: true,
    tickRate: 60,
    renderRate: 24,
    ...devOptions,
  });
  const scene = app.createScene(App, {bgHexRgb: 0x1A_1B_26, visible: true});
  app.start();
  return {app, scene};
}

if (import.meta.main) {
  run();
}
