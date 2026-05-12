import process from 'node:process';
import fs from 'node:fs';
import {suffix} from 'bun:ffi';

export const binaryName = `buntui.${suffix}`;

const platformKey = `${process.platform}-${process.arch}`;

function tryPlatformPackage(): string | undefined {
  try {
    const pkg = require(`@buntui/native-${platformKey}`);
    if (fs.existsSync(pkg.binaryPath)) {
      return pkg.binaryPath;
    }
  } catch {}

  return undefined;
}

export function getBinaryPath(): string {
  return tryPlatformPackage() ?? '';
}
