import process from 'node:process';
import {createApp} from '@buntui/core';
import {setDefaultProjectName} from '../../cli-args.ts';
import App from './App.vue';

export const ENTRY = 'App.vue';

export function run(options?: {logFilePath?: string}) {
  const args = process.argv.slice(2);
  setDefaultProjectName(args[0]);

  process.on('SIGINT', () => {
    process.exit(0);
  });

  const app = createApp({logLevel: 'info', clearLog: true, logFilePath: options?.logFilePath});
  app.createScene(App, {visible: true});
  app.start();
  return {app, scene: undefined};
}

if (import.meta.main) {
  run();
}
