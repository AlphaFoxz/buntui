import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import {CString, suffix, type Pointer as BunPointer} from 'bun:ffi';
import {getBinaryPath as getNativeBinaryPath} from '@buntui/native';
import type {Pointer} from '../platform/pointer';

let dllPath: string | undefined;

export function setDllPath(p: string) {
  dllPath = p;
}

export function resolveNativeLibPath(): string {
  if (dllPath !== undefined) {
    return dllPath;
  }

  const binaryName = `buntui.${suffix}`;
  const libPrefix = process.platform === 'win32' ? '' : 'lib';
  const libDir = process.platform === 'win32' ? 'bin' : 'lib';
  const distName = `${libPrefix}${binaryName}`;

  const envPath = process.env.BUNTUI_DLL;
  if (envPath) {
    dllPath = path.resolve(envPath);
    return dllPath;
  }

  const nativePath = getNativeBinaryPath();
  if (fs.existsSync(nativePath)) {
    dllPath = nativePath;
    return dllPath;
  }

  const mainDir = path.resolve(path.dirname(Bun.main), binaryName);
  if (fs.existsSync(mainDir)) {
    dllPath = mainDir;
    return dllPath;
  }

  const workspaceBin = path.resolve(import.meta.dir, '..', '..', '..', 'packages', 'native', 'zig-out', 'bin', binaryName);
  if (fs.existsSync(workspaceBin)) {
    dllPath = workspaceBin;
    return dllPath;
  }

  const workspaceLib = path.resolve(import.meta.dir, '..', '..', '..', 'packages', 'native', 'zig-out', libDir, distName);
  if (fs.existsSync(workspaceLib)) {
    dllPath = workspaceLib;
    return dllPath;
  }

  const platformKey = `${process.platform}-${process.arch}`;
  const hint = nativePath === ''
    ? `The platform binary package '@buntui/native-${platformKey}' is not installed — this usually means bunx/npx skipped optionalDependencies.`
    : `None of the searched locations contained ${binaryName}.`;
  const tried = [
    envPath ? `BUNTUI_DLL=${envPath}` : '(BUNTUI_DLL env not set)',
    nativePath || `@buntui/native-${platformKey} (not installed)`,
    mainDir,
    workspaceBin,
    workspaceLib,
  ];

  throw new Error([
    `[@buntui/core] Could not locate the native rendering library '${binaryName}' for ${platformKey}.`,
    hint,
    'How to fix:',
    `  - install the binary for your platform:  bun add @buntui/native-${platformKey}`,
    `  - or point to it explicitly:             set BUNTUI_DLL=/absolute/path/to/${binaryName}`,
    'Paths tried:',
    ...tried.map(t => `  - ${t}`),
  ].join('\n'));
}

export function assertPtr(p: Pointer | null): Pointer {
  if (p === null || p === undefined) {
    throw new Error('Invalid pointer');
  }

  return p;
}

export function cToString(p: Pointer, length: number): string {
  return new CString(p as BunPointer, 0, length).toString();
}
