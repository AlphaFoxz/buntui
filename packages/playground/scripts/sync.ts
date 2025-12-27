import {cp} from 'node:fs/promises';
import path from 'node:path';
import {suffix} from 'bun:ffi';

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

const tasksQueue: Array<Promise<void>> = [];
for (const task of tasks) {
	tasksQueue.push(cp(`${rootDir}${task.from}`, `${rootDir}${task.to}`, {recursive: true}));
}

await Promise.all(tasksQueue);

