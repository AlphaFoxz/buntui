import {defineConfig} from '@buntui/cli';

export default defineConfig({
  app: {
    logLevel: 'info',
    clearLog: true,
    tickRate: 120,
    renderRate: 60,
  },
});
