import {defineConfig} from '@buntui/cli';

export default defineConfig({
  app: {
    logLevel: 'info',
    clearLog: true,
    tickRate: 60,
    renderRate: 24,
  },
});
