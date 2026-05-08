import path from 'node:path';
import {createDevServer, CORE_REGISTRY, type DevServerOptions} from '@buntui/compiler';
import {ENTRY, run} from './main';

const {scene} = run();

const VUE_FILE = path.join(import.meta.dir, ENTRY);

createDevServer({
  file: VUE_FILE,
  compileOptions: {
    registry: CORE_REGISTRY,
    codegen: {
      coreModuleId: '@buntui/core',
      reactivityModuleId: '@vue/reactivity',
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
