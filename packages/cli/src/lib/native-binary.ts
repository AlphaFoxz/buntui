import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import {getBinaryPath} from '@buntui/native';

function getBinaryExt(): string {
  if (process.platform === 'win32') {
    return 'dll';
  }

  if (process.platform === 'darwin') {
    return 'dylib';
  }

  return 'so';
}

function getBinaryPrefix(): string {
  return process.platform === 'win32' ? '' : 'lib';
}

export function copyNativeBinary(distDir: string, cwd: string): void {
  const ext = getBinaryExt();
  const binaryName = `${getBinaryPrefix()}buntui.${ext}`;
  const nativePath = getBinaryPath();

  const candidates = [
    ...(nativePath ? [nativePath] : []),
    path.join(cwd, 'node_modules', '@buntui', 'core', binaryName),
    path.join(cwd, 'node_modules', '@buntui', 'core', 'src', 'utils', `buntui.${ext}`),
    path.join(cwd, binaryName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const dest = path.join(distDir, `buntui.${ext}`);
      fs.copyFileSync(candidate, dest);
      console.log(`  ${`buntui.${ext}`} (copied)`);
      return;
    }
  }

  console.warn('  Warning: native binary not found');
}
