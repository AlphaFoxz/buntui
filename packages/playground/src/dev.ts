#!/usr/bin/env bun
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import {createDevServer, CORE_REGISTRY, type DevServerOptions} from '@buntui/compiler';
import {mountHmrErrorOverlay, type HmrErrorOverlayHandle} from '@buntui/extensions/hmr-error-overlay';

const appName = process.argv[2];
if (!appName) {
  console.error('Usage: bun run dev <app-name>');
  console.error('Available apps:');
  const appsDir = path.join(import.meta.dir, 'apps');
  for (const name of fs.readdirSync(appsDir)) {
    if (fs.statSync(path.join(appsDir, name)).isDirectory()) {
      console.error(`  - ${name}`);
    }
  }

  process.exit(1);
}

const appDir = path.join(import.meta.dir, 'apps', appName);
const mainPath = path.join(appDir, 'main.ts');

if (!fs.existsSync(mainPath)) {
  console.error(`App not found: ${appName}`);
  process.exit(1);
}

type AppModule = {ENTRY: string; run: (options?: {logFilePath?: string}) => {scene: {clearWidgets: () => void; mount: (w: unknown) => void; unmount: (w: unknown) => void}}};
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- dynamic import returns any by design
const mod = (await import(mainPath)) as AppModule;

const DEV_DIR = path.join(import.meta.dir, '.dev', appName);
fs.mkdirSync(DEV_DIR, {recursive: true});

const {scene} = mod.run({logFilePath: DEV_DIR});

const VUE_FILE = path.join(appDir, mod.ENTRY);

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
