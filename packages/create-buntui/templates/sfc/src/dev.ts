import path from 'node:path';
import fs from 'node:fs';
import {createDevServer, CORE_REGISTRY, type DevServerOptions} from '@buntui/compiler';
import {mountHmrErrorOverlay, type HmrErrorOverlayHandle} from '@buntui/extensions/hmr-error-overlay';
import {ENTRY, run} from './main';

const DEV_DIR = path.join(import.meta.dir, '.dev');
fs.mkdirSync(DEV_DIR, {recursive: true});

const {scene} = run({logFilePath: DEV_DIR});

const VUE_FILE = path.join(import.meta.dir, ENTRY);

let errorOverlay: HmrErrorOverlayHandle | undefined;

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
    errorOverlay?.dismiss();
    errorOverlay = undefined;
    scene.clearWidgets();
  },
  onReload(setupFn: (scene: unknown) => void) {
    errorOverlay?.dismiss();
    errorOverlay = undefined;
    setupFn(scene);
  },
  onError(error: Error) {
    errorOverlay?.dismiss();
    errorOverlay = mountHmrErrorOverlay(scene, error);
  },
} satisfies DevServerOptions);
