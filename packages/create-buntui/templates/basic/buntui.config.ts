import {defineConfig} from '@buntui/cli';

export default defineConfig({
  app: {
    logLevel: 'info',
    clearLog: true,
    tickRate: 30,
    renderRate: 24,
  },
});
