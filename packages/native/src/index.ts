import path from 'node:path';
import process from 'node:process';
import {suffix} from 'bun:ffi';

const platformKey = `${process.platform}-${process.arch}`;

export const binaryName = `buntui.${suffix}`;

export function getBinaryPath(): string {
  return path.resolve(import.meta.dir, '..', 'binaries', platformKey, binaryName);
}
