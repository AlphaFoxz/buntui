import {createApp} from '@buntui/core';
import Demo from './Demo.vue';
// Import Demo from './VideoPlayer.vue';

export const ENTRY = 'Demo.vue';
// Export const ENTRY = 'VideoPlayer.vue';

export function run() {
  const app = createApp({
    logLevel: 'debug', clearLog: true, debugMode: true, tickRate: 120, renderRate: 60,
  });
  const scene = app.createScene(Demo, {bgHexRgb: 0x00_00_00, visible: true});
  // App.switchScene(scene);
  app.start();
  // Scene.setVisible(false);
  return {app, scene};
}

if (import.meta.main) {
  run();
}
