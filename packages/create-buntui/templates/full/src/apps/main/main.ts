import {runApp} from '../../shared/runApp.ts';
import App from './App.vue';

export const ENTRY = 'App.vue';

export function run(options?: {logFilePath?: string}) {
  return runApp(App, options);
}

if (import.meta.main) {
  run();
}
