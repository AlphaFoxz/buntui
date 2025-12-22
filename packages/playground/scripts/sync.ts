import { cp } from 'fs/promises';
import path from 'path';
import { suffix } from 'bun:ffi';

const appName = 'term_bed';

const rootDir = path.resolve(import.meta.dir, '..', '..');
const tasks = [
    {
        from: `/native/zig-out/bin/${appName}.${suffix}`,
        to: `/playground/${appName}.${suffix}`,
    },
    {
        from: `/native/zig-out/bin/${appName}.pdb`,
        to: `/playground/${appName}.pdb`,
    },
];

for (const task of tasks) {
    await cp(`${rootDir}${task.from}`, `${rootDir}${task.to}`, { recursive: true });
}
