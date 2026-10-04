import {defineConfig} from '@buntui/cli';

const config = defineConfig({
  app: {
    logLevel: 'info',
    shouldClearLog: true,
    shouldQuitOnQ: true,
  },
});

export default config;
