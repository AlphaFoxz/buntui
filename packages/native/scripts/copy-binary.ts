import {cp, mkdir} from 'node:fs/promises';
import path from 'node:path';
import fs from 'node:fs';
import {execSync} from 'node:child_process';

const appName = 'buntui';

const targets = [
  {
    zigTarget: 'x86_64-windows-gnu',
    platformKey: 'win32-x64',
    libDir: 'bin',
    libPrefix: '',
    binaryExt: 'dll',
  },
  {
    zigTarget: 'x86_64-linux-gnu',
    platformKey: 'linux-x64',
    libDir: 'lib',
    libPrefix: 'lib',
    binaryExt: 'so',
  },
  {
    zigTarget: 'aarch64-macos',
    platformKey: 'darwin-arm64',
    libDir: 'lib',
    libPrefix: 'lib',
    binaryExt: 'dylib',
  },
  {
    zigTarget: 'x86_64-macos',
    platformKey: 'darwin-x64',
    libDir: 'lib',
    libPrefix: 'lib',
    binaryExt: 'dylib',
  },
];

const nativeDir = path.resolve(import.meta.dir, '..');

const copyTasks: Array<{from: string; to: string}> = [];

for (const target of targets) {
  console.log(`Building for ${target.platformKey} (${target.zigTarget})...`);
  execSync(`zig build -Dtarget=${target.zigTarget} -Drelease=true`, {
    cwd: nativeDir,
    stdio: 'inherit',
  });

  const dest = path.join(nativeDir, '..', 'native-platforms', target.platformKey);
  const distName = `${target.libPrefix}${appName}.${target.binaryExt}`;
  const from = path.join(nativeDir, 'zig-out', target.libDir, distName);
  const to = path.join(dest, `${appName}.${target.binaryExt}`);

  if (fs.existsSync(from)) {
    copyTasks.push({from, to});
  } else {
    console.warn(`Warning: ${from} not found`);
  }
}

await Promise.all(copyTasks.map(async task => {
  await mkdir(path.dirname(task.to), {recursive: true});
  await cp(task.from, task.to);
  console.log(`Copied: ${path.relative(nativeDir, task.from)} -> ${path.relative(nativeDir, task.to)}`);
}));
