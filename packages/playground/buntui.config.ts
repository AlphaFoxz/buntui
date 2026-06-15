import {defineConfig} from '@buntui/cli';

const config = defineConfig({
  app: {
    logLevel: 'debug',
    clearLog: true,
    debugMode: true,
    quitOnQ: true,
    tickRate: 30,
    renderRate: 24,
  },
});

export default config;
