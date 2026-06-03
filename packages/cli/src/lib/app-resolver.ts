import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import {APPS_DIR} from './constants.ts';

export type AppInfo = {
  name: string;
  dir: string;
  mainPath: string;
  entryVue: string;
  hasCustomMain: boolean;
};

export function getCwd(): string {
  return process.cwd();
}

export function getAppsDir(cwd?: string): string {
  return path.join(cwd ?? getCwd(), APPS_DIR);
}

export function listApps(cwd?: string): AppInfo[] {
  const appsDir = getAppsDir(cwd);
  if (!fs.existsSync(appsDir)) {
    return [];
  }

  const apps: AppInfo[] = [];
  for (const name of fs.readdirSync(appsDir)) {
    const dir = path.join(appsDir, name);
    if (!fs.statSync(dir).isDirectory()) {
      continue;
    }

    const mainPath = path.join(dir, 'main.ts');
    const entryVue = path.join(dir, 'App.vue');
    if (!fs.existsSync(mainPath) && !fs.existsSync(entryVue)) {
      continue;
    }

    apps.push({
      name,
      dir,
      mainPath,
      entryVue,
      hasCustomMain: fs.existsSync(mainPath),
    });
  }

  return apps;
}

export function resolveApp(name: string | undefined, cwd?: string): AppInfo {
  const apps = listApps(cwd);

  if (apps.length === 0) {
    console.error('No apps found in src/apps/');
    console.error('Create an app at src/apps/<name>/App.vue');
    process.exit(1);
  }

  if (name) {
    const app = apps.find(a => a.name === name);
    if (!app) {
      console.error(`App not found: ${name}`);
      console.error('Available apps:');
      for (const a of apps) {
        console.error(`  - ${a.name}`);
      }

      process.exit(1);
    }

    return app;
  }

  if (apps.length === 1) {
    return apps[0]!;
  }

  console.error('Multiple apps found. Specify an app name:');
  for (const a of apps) {
    console.error(`  - ${a.name}`);
  }

  process.exit(1);
}

export function getPublicDir(cwd?: string): string {
  return path.join(cwd ?? getCwd(), 'public');
}

export function getDistDir(cwd?: string): string {
  return path.join(cwd ?? getCwd(), 'dist');
}

export function getDevDir(cwd?: string): string {
  return path.join(cwd ?? getCwd(), 'src', '.dev');
}
