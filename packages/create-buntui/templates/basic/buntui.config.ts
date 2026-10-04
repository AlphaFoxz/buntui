import {defineConfig} from '@buntui/cli';

export default defineConfig({
  app: {
    logLevel: 'info',
    shouldClearLog: true,
    tickRate: 30,
    renderRate: 24,
    shouldQuitOnQ: true,
  },
});
