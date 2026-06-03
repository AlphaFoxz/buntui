import {createApp, type TuiSFCModule} from '@buntui/core';

export function runApp(vueComponent: TuiSFCModule, options: {logFilePath?: string} = {}) {
  const app = createApp({
    logLevel: 'info',
    clearLog: true,
    tickRate: 60,
    renderRate: 24,
    ...options,
  });
  const scene = app.createScene(vueComponent, {bgHexRgb: 0x1A_1B_26, visible: true});
  app.start();
  return {app, scene};
}
