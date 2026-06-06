import {defineConfig} from '@buntui/cli';

const config = defineConfig({
  app: {
    logLevel: 'debug',
    clearLog: true,
    debugMode: true,
    quitOnQ: true,
    tickRate: 60,
    renderRate: 48,
  },
});

export default config;
