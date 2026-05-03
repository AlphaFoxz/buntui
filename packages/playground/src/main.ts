import {createApp} from '@buntui/core';
import {setup} from './App.vue';
// Import {setup} from './AppMatrix.vue';

export function run() {
  const app = createApp({logLevel: 'debug', clearLog: true, debugMode: true});
  const scene = app.createScene({bgHexRgb: 0x00_00_00, visible: true});

  setup(scene);
  app.switchScene(scene);
  app.start();
  return {app, scene};
}

if (import.meta.main) {
  run();
}
