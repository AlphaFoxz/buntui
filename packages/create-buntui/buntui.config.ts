import {defineConfig} from '@buntui/cli';

const config = defineConfig({
  app: {
    logLevel: 'info',
    clearLog: true,
    quitOnQ: true,
  },
});

export default config;
