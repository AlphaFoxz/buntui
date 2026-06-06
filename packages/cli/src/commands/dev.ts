import '@buntui/compiler/vue-plugin';
import path from 'node:path';
import fs from 'node:fs';
import {createDevServer, type DevServerOptions} from '@buntui/compiler';
import {createApp, type TuiSFCModule, type TuiScene} from '@buntui/core';
import {mountHmrErrorOverlay, type HmrErrorOverlayHandle} from '@buntui/extensions/hmr-error-overlay';
import {resolveApp, getDevDir, getCwd} from '../lib/app-resolver.ts';
import {DEFAULT_COMPILE_OPTIONS, DEFAULT_APP_OPTIONS} from '../lib/constants.ts';
import {loadConfig} from '../lib/config.ts';

type AppModule = {
  ENTRY: string;
  run: (options?: {logFilePath?: string}) => {scene: TuiScene};
};

export async function devCommand(appName?: string): Promise<void> {
  const cwd = getCwd();
  const app = resolveApp(appName);
  const devDir = getDevDir();
  const appDevDir = path.join(devDir, app.name);
  fs.mkdirSync(appDevDir, {recursive: true});

  let vueFile: string;
  let scene: TuiScene;

  if (app.hasCustomMain) {
    const mod = (await import(app.mainPath)) as AppModule;
    const entry = mod.ENTRY ?? 'App.vue';
    vueFile = path.join(app.dir, entry);
    const result = mod.run({logFilePath: appDevDir});
    scene = result.scene;
  } else {
    vueFile = app.entryVue;
    const config = await loadConfig(cwd);
    const tuiApp = createApp({
      ...DEFAULT_APP_OPTIONS,
      ...config.app,
      logFilePath: appDevDir,
    });
    const component = await import(app.entryVue) as TuiSFCModule;
    scene = tuiApp.createScene(component, {visible: true});
  }

  let errorOverlay: HmrErrorOverlayHandle | undefined;

  createDevServer({
    file: vueFile,
    tempDir: appDevDir,
    compileOptions: DEFAULT_COMPILE_OPTIONS,
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

  console.log(`\n  Dev server started for "${app.name}"`);
  console.log(`  Watching: ${vueFile}\n`);
}
