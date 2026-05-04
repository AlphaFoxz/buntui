import {cp} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {suffix} from 'bun:ffi';

const appName = 'buntui';

const rootDir = path.resolve(import.meta.dir, '..', '..');
const libPrefix = process.platform === 'win32' ? '' : 'lib';
const libDir = process.platform === 'win32' ? 'bin' : 'lib';
const tasks: Array<{from: string; to: string}> = [
  {
    from: `/native/zig-out/${libDir}/${libPrefix}${appName}.${suffix}`,
    to: `/core/src/utils/${appName}.${suffix}`,
  },
];

if (process.platform === 'win32') {
  tasks.push({
    from: `/native/zig-out/bin/${appName}.pdb`,
    to: `/core/src/utils/${appName}.pdb`,
  });
}

const queue: Array<Promise<void>> = [];
for (const task of tasks) {
  queue.push(cp(`${rootDir}${task.from}`, `${rootDir}${task.to}`, {recursive: true}));
}

await Promise.all(queue);
