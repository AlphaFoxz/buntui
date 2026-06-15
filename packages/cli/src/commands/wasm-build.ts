import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import {binaryPath} from '@buntui/native-wasm32-wasi';
import {listApps, getDistDir, getCwd} from '../lib/app-resolver.ts';
import {createVuePlugin} from '../lib/vue-plugin.ts';

function generateEntryContent(entryPath: string, webRuntimePath: string | undefined): string {
  if (!webRuntimePath) {
    return `export {default as App} from ${JSON.stringify(entryPath)};\n`;
  }

  return [
    `import App from ${JSON.stringify(entryPath)};`,
    `import {createWebApp as createWebAppImpl, type WebAppOptions} from ${JSON.stringify(webRuntimePath)};`,
    'import type {TerminalLike} from \'@buntui/core\';',
    '',
    'export {App};',
    'export async function createWebApp(terminal: TerminalLike, options: WebAppOptions) {',
    '  return createWebAppImpl(terminal, App, options);',
    '}',
    '',
  ].join('\n');
}

function generateDtsContent(hasWebRuntime: boolean): string {
  if (!hasWebRuntime) {
    return 'import type {TuiSFCModule} from \'@buntui/core\';\n\ndeclare const App: TuiSFCModule;\nexport {App};\n';
  }

  return [
    'import type {TerminalLike, TuiApp, TuiSFCModule} from \'@buntui/core\';',
    '',
    'export interface WebAppOptions {',
    '  wasmUrl: string;',
    '  logLevel?: \'debug\' | \'info\' | \'warn\' | \'error\';',
    '}',
    '',
    'declare const App: TuiSFCModule;',
    'declare function createWebApp(terminal: TerminalLike, options: WebAppOptions): Promise<TuiApp>;',
    'export {App, createWebApp};',
    '',
  ].join('\n');
}

async function buildApp(appName: string, distDir: string, cwd: string): Promise<void> {
  const appsDir = path.join(cwd, 'src', 'apps');
  const entryPath = path.join(appsDir, appName, 'App.vue');
  const webApiPath = path.join(cwd, 'src', 'web-api.ts');
  const resolvedWebRuntime = fs.existsSync(webApiPath) ? webApiPath : undefined;
  const temporaryEntryPath = path.join(distDir, `_entry_${appName}.ts`);
  const temporaryContent = generateEntryContent(entryPath, resolvedWebRuntime);
  fs.writeFileSync(temporaryEntryPath, temporaryContent);

  const result = await Bun.build({
    entrypoints: [temporaryEntryPath],
    outdir: distDir,
    naming: '[name].js',
    target: 'browser',
    minify: true,
    plugins: [createVuePlugin()],
    external: ['@buntui/core', '@vue/reactivity'],
  });

  fs.unlinkSync(temporaryEntryPath);

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }

    throw new Error(`Build failed for app "${appName}"`);
  }

  const originalName = `_entry_${appName}.js`;
  const targetName = `${appName}.js`;
  const originalPath = path.join(distDir, originalName);
  const targetPath = path.join(distDir, targetName);

  if (fs.existsSync(originalPath)) {
    fs.renameSync(originalPath, targetPath);
  }

  const size = (fs.statSync(targetPath).size / 1024).toFixed(1);
  console.log(`  ${targetName} (${size} KB)`);
}

function generateDts(appName: string, distDir: string, cwd: string): void {
  const webApiPath = path.join(cwd, 'src', 'web-api.ts');
  const hasWebRuntime = fs.existsSync(webApiPath);
  const dtsContent = generateDtsContent(hasWebRuntime);
  fs.writeFileSync(path.join(distDir, `${appName}.d.ts`), dtsContent);
}

export async function wasmBuildCommand(): Promise<void> {
  const cwd = getCwd();
  const distDir = getDistDir(cwd);
  const apps = listApps(cwd);

  if (apps.length === 0) {
    console.error('No apps found in src/apps/');
    console.error('Create an app at src/apps/<name>/App.vue');
    process.exit(1);
  }

  fs.mkdirSync(distDir, {recursive: true});

  for (const file of fs.readdirSync(distDir)) {
    if (file.endsWith('.js') || file.endsWith('.d.ts')) {
      fs.unlinkSync(path.join(distDir, file));
    }
  }

  console.log(`Building ${apps.length} app(s): ${apps.map(a => a.name).join(', ')}\n`);

  const publicDir = path.join(cwd, 'public');
  const wasmDest = path.join(publicDir, 'buntui.wasm');
  fs.mkdirSync(publicDir, {recursive: true});
  fs.copyFileSync(binaryPath, wasmDest);
  console.log('  Copied buntui.wasm to public/');

  let chain: Promise<void> = Promise.resolve();
  for (const app of apps) {
    chain = chain.then(async () => {
      await buildApp(app.name, distDir, cwd);
      generateDts(app.name, distDir, cwd);
    });
  }

  await chain;

  console.log('\n  Build complete!');
}
