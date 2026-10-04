import {defineConfig} from '@buntui/cli';

const config = defineConfig({
  app: {
    logLevel: 'debug',
    shouldClearLog: true,
    isDebugMode: true,
    shouldQuitOnQ: true,
    tickRate: 30,
    renderRate: 24,
  },
});

export default config;
