import process from 'node:process';
import fs from 'node:fs';
import {suffix} from 'bun:ffi';

export const binaryName = `buntui.${suffix}`;

const platformKey = `${process.platform}-${process.arch}`;

function tryPlatformPackage(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports,unicorn/prefer-module,@typescript-eslint/no-unsafe-type-assertion
    const pkg = require(`@buntui/native-${platformKey}`) as {binaryPath: string};
    if (fs.existsSync(pkg.binaryPath)) {
      return pkg.binaryPath;
    }
  } catch {
    // ignore
  }

  return undefined;
}

export function getBinaryPath(): string {
  return tryPlatformPackage() ?? '';
}
