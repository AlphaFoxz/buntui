#!/usr/bin/env bun
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'vite';
import {buntuiSfcPlugin} from './vite-plugin.ts';

const APPS_DIR = path.resolve(import.meta.dirname, 'src/apps');

function listApps(): string[] {
  if (!fs.existsSync(APPS_DIR)) {
    return [];
  }

  return fs.readdirSync(APPS_DIR).filter(name => {
    const dir = path.join(APPS_DIR, name);
    return fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, 'App.vue'));
  });
}

function resolveApp(appName: string | undefined): string {
  const apps = listApps();

  if (apps.length === 0) {
    console.error('No apps found in src/apps/');
    console.error('Create an app at src/apps/<name>/App.vue');
    process.exit(1);
  }

  if (appName) {
    if (!apps.includes(appName)) {
      console.error(`App not found: ${appName}`);
      console.error('Available apps:');
      for (const a of apps) {
        console.error(`  - ${a}`);
      }

      process.exit(1);
    }

    return appName;
  }

  if (apps.includes('main')) {
    return 'main';
  }

  console.error('Default app "main" not found. Specify an app name:');
  for (const a of apps) {
    console.error(`  - ${a}`);
  }

  process.exit(1);
}

const appName = resolveApp(process.argv[2]);
console.log(`\n  Starting dev server for "${appName}"...\n`);

const server = await createServer({
  configFile: false,
  root: import.meta.dirname,
  plugins: [buntuiSfcPlugin()],
  define: {
    BUNTUI_APP_NAME: JSON.stringify(appName),
  },
  server: {
    fs: {
      allow: ['..'],
    },
    open: true,
  },
  optimizeDeps: {
    exclude: ['@buntui/core'],
  },
});

await server.listen();
server.printUrls();
