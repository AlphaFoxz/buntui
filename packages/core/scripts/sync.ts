import {cp} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import {suffix} from 'bun:ffi';

const appName = 'buntui';
const platformKey = `${process.platform}-${process.arch}`;
const binaryName = `${appName}.${suffix}`;

const rootDir = path.resolve(import.meta.dir, '..', '..');
const nativeBinary = path.join(rootDir, 'native', 'binaries', platformKey, binaryName);

const tasks: Array<{from: string; to: string}> = [
  {
    from: nativeBinary,
    to: path.join(rootDir, 'core', 'src', 'utils', binaryName),
  },
];

if (process.platform === 'win32') {
  const pdbName = `${appName}.pdb`;
  const pdbSource = path.join(rootDir, 'native', 'binaries', platformKey, pdbName);
  if (fs.existsSync(pdbSource)) {
    tasks.push({
      from: pdbSource,
      to: path.join(rootDir, 'core', 'src', 'utils', pdbName),
    });
  }
}

const queue: Array<Promise<void>> = [];
for (const task of tasks) {
  if (fs.existsSync(task.from)) {
    queue.push(cp(task.from, task.to, {recursive: true}));
  } else {
    console.warn(`Warning: ${task.from} not found, run native build first`);
  }
}

await Promise.all(queue);
