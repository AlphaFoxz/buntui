import {createApp} from '@buntui/core';
import App from './App.vue';
// Import App from './VideoPlayer.vue';

export const ENTRY = 'App.vue';
// Export const ENTRY = 'VideoPlayer.vue';

export function run(devOptions: {logFilePath?: string} = {}) {
  const app = createApp({
    logLevel: 'debug',
    clearLog: true,
    debugMode: true,
    tickRate: 60,
    renderRate: 24,
    ...devOptions,
  });
  const scene = app.createScene(App, {visible: true});
  // App.switchScene(scene);
  app.start();
  // Scene.setVisible(false);
  return {app, scene};
}

if (import.meta.main) {
  run();
}
