import {cp, mkdir} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import {suffix} from 'bun:ffi';

const appName = 'buntui';
const platformKey = `${process.platform}-${process.arch}`;
const binaryName = `${appName}.${suffix}`;

const nativeDir = path.resolve(import.meta.dir, '..');
const libPrefix = process.platform === 'win32' ? '' : 'lib';
const libDir = process.platform === 'win32' ? 'bin' : 'lib';
const distName = `${libPrefix}${binaryName}`;

const targetDir = path.join(nativeDir, 'binaries', platformKey);

const tasks: Array<{from: string; to: string}> = [
  {
    from: path.join(nativeDir, 'zig-out', libDir, distName),
    to: path.join(targetDir, binaryName),
  },
];

if (process.platform === 'win32') {
  tasks.push({
    from: path.join(nativeDir, 'zig-out', 'bin', `${appName}.pdb`),
    to: path.join(targetDir, `${appName}.pdb`),
  });
}

await mkdir(targetDir, {recursive: true});

for (const task of tasks) {
  if (fs.existsSync(task.from)) {
    // eslint-disable-next-line no-await-in-loop
    await cp(task.from, task.to);
    console.log(`Copied: ${path.relative(nativeDir, task.from)} -> ${path.relative(nativeDir, task.to)}`);
  } else {
    console.warn(`Warning: ${task.from} not found, skipping`);
  }
}
