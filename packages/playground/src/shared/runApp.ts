import path from 'node:path';
import fs from 'node:fs';
import {createApp, type TuiSFCModule} from '@buntui/core';

export function resolvePublic(filename: string): string {
  const prodPath = path.join(import.meta.dir, 'public', filename);
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  return path.join(import.meta.dir, '..', '..', 'public', filename);
}

export function runApp(vueComponent: TuiSFCModule, options: {logFilePath?: string} = {}) {
  const app = createApp({
    logLevel: 'debug',
    clearLog: true,
    debugMode: true,
    tickRate: 60,
    renderRate: 48,
    ...options,
  });
  const scene = app.createScene(vueComponent, {visible: true});
  app.start();
  return {app, scene};
}
