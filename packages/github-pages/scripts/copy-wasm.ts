import fs from 'node:fs';
import path from 'node:path';
import {binaryPath} from '@buntui/native-wasm32-wasi';

const dest = path.resolve(import.meta.dirname, '../public/buntui.wasm');

fs.mkdirSync(path.dirname(dest), {recursive: true});
fs.copyFileSync(binaryPath, dest);
console.log('Copied buntui.wasm to public/');
