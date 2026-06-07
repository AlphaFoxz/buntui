import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import {binaryPath} from '@buntui/native-wasm32-wasi';
import {resolveApp, getCwd} from '../lib/app-resolver.ts';
import {createBuntuiVitePlugin} from '../lib/vite-plugin.ts';

export async function wasmDevCommand(appName?: string): Promise<void> {
  const cwd = getCwd();
  const app = resolveApp(appName, cwd);

  const publicDir = path.join(cwd, 'public');
  const wasmDest = path.join(publicDir, 'buntui.wasm');

  fs.mkdirSync(publicDir, {recursive: true});
  fs.copyFileSync(binaryPath, wasmDest);
  console.log('  Copied buntui.wasm to public/');

  const indexHtml = path.join(cwd, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.error('index.html not found in project root.');
    process.exit(1);
  }

  const vite = await import('vite');
  const plugin = await createBuntuiVitePlugin();

  console.log(`\n  Starting WASM dev server for "${app.name}"...\n`);

  const server = await vite.createServer({
    configFile: false,
    root: cwd,
    plugins: [plugin],
    define: {
      BUNTUI_APP_NAME: JSON.stringify(app.name),
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
}
