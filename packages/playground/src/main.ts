import path from 'node:path';
import {createApp} from 'core';
import {createDevServer, type DevServerOptions} from 'compiler';
import {setup} from './App.vue';

const VUE_FILE = path.join(import.meta.dir, 'App.vue');

const app = createApp({logLevel: 'debug', clearLog: true, debugMode: true});
const scene = app.createScene({bgHexRgb: 0x1E_1E_2E, visible: true});
setup(scene);
app.switchScene(scene);
app.start();

createDevServer({
  file: VUE_FILE,
  compileOptions: {codegen: {coreModuleId: 'core', reactivityModuleId: '@vue/reactivity'}},
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
