import path from 'node:path';
import fs from 'node:fs';
import {createDevServer, CORE_REGISTRY, type DevServerOptions} from '@buntui/compiler';
import {ENTRY, run} from './main';

const DEV_DIR = path.join(import.meta.dir, '.dev');
fs.mkdirSync(DEV_DIR, {recursive: true});

const {scene} = run({logFilePath: DEV_DIR});

const VUE_FILE = path.join(import.meta.dir, ENTRY);

createDevServer({
  file: VUE_FILE,
  tempDir: DEV_DIR,
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
