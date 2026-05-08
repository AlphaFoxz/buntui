import {createApp} from '@buntui/core';
import Demo from './Demo.vue';

export const ENTRY = 'Demo.vue';

export function run() {
  const app = createApp({logLevel: 'debug', clearLog: true, debugMode: true});
  const scene = app.createScene(Demo, {bgHexRgb: 0x00_00_00, visible: true});
  // App.switchScene(scene);
  app.start();
  // Scene.setVisible(false);
  return {app, scene};
}

if (import.meta.main) {
  run();
}
