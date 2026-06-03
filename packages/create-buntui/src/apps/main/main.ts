import process from 'node:process';
import {createApp} from '@buntui/core';
import {setApp, setDefaultProjectName} from '../../shared/app-context.ts';
import App from './App.vue';

export const ENTRY = 'App.vue';

export function run() {
  const args = process.argv.slice(2);
  const defaultName = args[0];

  process.on('SIGINT', () => {
    process.exit(0);
  });

  const app = createApp({logLevel: 'info', clearLog: true});
  setApp(app);
  setDefaultProjectName(defaultName);
  app.createScene(App, {visible: true});
  app.start();
  return {app, scene: undefined};
}

if (import.meta.main) {
  run();
}
