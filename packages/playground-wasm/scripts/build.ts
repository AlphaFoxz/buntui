import fs from 'node:fs';
import path from 'node:path';
import {type BunPlugin, type PluginBuilder} from 'bun';
import {compileSfc} from './compile.ts';

const APPS_DIR = path.resolve(import.meta.dirname, '../src/apps');
const DIST_DIR = path.resolve(import.meta.dirname, '../dist');

function createBunVuePlugin(): BunPlugin {
  return {
    name: 'buntui-vue',
    setup(build: PluginBuilder) {
      build.onLoad({filter: /\.vue$/}, async (args) => {
        const source = await Bun.file(args.path).text();
        const code = compileSfc(source, args.path);
        return {contents: code, loader: 'ts'};
      });
    },
  };
}

function listApps(): string[] {
  if (!fs.existsSync(APPS_DIR)) {
    return [];
  }

  return fs.readdirSync(APPS_DIR).filter((name) => {
    const dir = path.join(APPS_DIR, name);
    return fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, 'App.vue'));
  });
}

async function buildApp(appName: string): Promise<void> {
  const entryPath = path.join(APPS_DIR, appName, 'App.vue');
  const tempEntryPath = path.join(DIST_DIR, `_entry_${appName}.ts`);
  const tempContent = `export {default as App} from ${JSON.stringify(entryPath)};\n`;
  fs.writeFileSync(tempEntryPath, tempContent);

  const result = await Bun.build({
    entrypoints: [tempEntryPath],
    outdir: DIST_DIR,
    naming: `[name].js`,
    target: 'browser',
    minify: true,
    plugins: [createBunVuePlugin()],
    external: ['@buntui/core', '@vue/reactivity'],
  });

  fs.unlinkSync(tempEntryPath);

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }

    throw new Error(`Build failed for app "${appName}"`);
  }

  const originalName = `_entry_${appName}.js`;
  const targetName = `${appName}.js`;
  const originalPath = path.join(DIST_DIR, originalName);
  const targetPath = path.join(DIST_DIR, targetName);

  if (fs.existsSync(originalPath)) {
    fs.renameSync(originalPath, targetPath);
  }

  const size = (fs.statSync(targetPath).size / 1024).toFixed(1);
  console.log(`  ${targetName} (${size} KB)`);
}

async function generateDts(appName: string): Promise<void> {
  const dtsContent = `import type {TuiSFCModule} from '@buntui/core';\n\ndeclare const App: TuiSFCModule;\nexport {App};\n`;
  fs.writeFileSync(path.join(DIST_DIR, `${appName}.d.ts`), dtsContent);
}

async function main(): Promise<void> {
  const apps = listApps();
  if (apps.length === 0) {
    console.error('No apps found in src/apps/');
    console.error('Create an app at src/apps/<name>/App.vue');
    process.exit(1);
  }

  fs.mkdirSync(DIST_DIR, {recursive: true});

  for (const file of fs.readdirSync(DIST_DIR)) {
    if (file.endsWith('.js') || file.endsWith('.d.ts')) {
      fs.unlinkSync(path.join(DIST_DIR, file));
    }
  }

  console.log(`Building ${apps.length} app(s): ${apps.join(', ')}\n`);

  for (const appName of apps) {
    await buildApp(appName);
    await generateDts(appName);
  }

  console.log('\n  Build complete!');
}

await main();
