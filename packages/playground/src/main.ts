import path from 'node:path';
import process from 'node:process';
import {watch} from 'node:fs';
import {createApp} from 'core';
import {compile} from 'compiler';
import {setup} from './App.vue';

const VUE_FILE = path.join(import.meta.dir, 'App.vue');

const app = createApp({logLevel: 'debug', clearLog: true, debugMode: true});
const scene = app.createScene({bgHexRgb: 0x1E_1E_2E, visible: true});
setup(scene);
app.switchScene(scene);
app.start();

type SetupModule = {setup: (scene: ReturnType<typeof app.createScene>) => void};
let hmrTimer: ReturnType<typeof setTimeout> | undefined;

async function hmrUpdate() {
  scene.clearWidgets();
  const source = await Bun.file(VUE_FILE).text();
  const result = compile(source, {
    filename: VUE_FILE,
    codegen: {coreModuleId: 'core', reactivityModuleId: '@vue/reactivity'},
  });
  const temporaryFile = path.join(import.meta.dir, `_hmr_${Date.now()}.ts`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access -- compiler has no type declarations
  await Bun.write(temporaryFile, result.code);
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- dynamic import of compiled output
    const mod = (await import(temporaryFile)) as SetupModule;
    mod.setup(scene);
  } finally {
    await Bun.file(temporaryFile).unlink();
  }
}

const watcher = watch(VUE_FILE, (eventType: string) => {
  if (eventType === 'change') {
    clearTimeout(hmrTimer);
    hmrTimer = setTimeout(() => {
      void hmrUpdate();
    }, 100);
  }
});

process.on('exit', () => {
  watcher.close();
});
