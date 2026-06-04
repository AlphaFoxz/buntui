import {copyFile, mkdir} from 'node:fs/promises';
import path from 'node:path';

const src = path.resolve(import.meta.dirname, '../../native-platforms/wasm32-wasi/buntui.wasm');
const dest = path.resolve(import.meta.dirname, '../public/buntui.wasm');

try {
  await mkdir(path.dirname(dest), {recursive: true});
  await copyFile(src, dest);
  console.log('Copied buntui.wasm to public/');
} catch {
  console.error('WASM binary not found. Run "bun run --cwd ./packages/native build" first.');
  process.exit(1);
}
