import {cp} from 'node:fs/promises';
import path from 'node:path';
import {suffix} from 'bun:ffi';

const appName = 'term_bed';

const rootDir = path.resolve(import.meta.dir, '..', '..');
const tasks = [
  {
    from: `/native/zig-out/bin/${appName}.${suffix}`,
    to: `/core/src/utils/${appName}.${suffix}`,
  },
  {
    from: `/native/zig-out/bin/${appName}.pdb`,
    to: `/core/src/utils/${appName}.pdb`,
  },
];

const queue: Array<Promise<void>> = [];
for (const task of tasks) {
  queue.push(cp(`${rootDir}${task.from}`, `${rootDir}${task.to}`, {recursive: true}));
}

await Promise.all(queue);

