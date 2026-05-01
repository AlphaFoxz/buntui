import path from 'node:path';
import {createDevServer, type DevServerOptions} from '@buntui/compiler';
import {run} from './main';

const {scene} = run();

const VUE_FILE = path.join(import.meta.dir, 'App.vue');

createDevServer({
  file: VUE_FILE,
  compileOptions: {
    codegen: {
      coreModuleId: '@buntui/core',
      reactivityModuleId: '@vue/reactivity',
      widgetModuleMap: {
        createFrameRateWatcher: '@buntui/extensions',
      },
    },
  },
  onClear() {
    scene.clearWidgets();
  },
  onReload(setupFn: (scene: unknown) => void) {
    setupFn(scene);
  },
  onError(error: Error) {
    console.error('[HMR]', error);
  },
} satisfies DevServerOptions);
