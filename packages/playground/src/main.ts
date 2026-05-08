import {createApp} from '@buntui/core';
import Demo from './Demo.vue';

export function run() {
  const app = createApp({logLevel: 'debug', clearLog: true, debugMode: true});
  const scene = app.createScene(Demo, {bgHexRgb: 0x00_00_00, visible: true});
  app.switchScene(scene);
  app.start();
  return {app, scene};
}

if (import.meta.main) {
  run();
}
