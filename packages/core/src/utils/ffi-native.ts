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
  if (dllPath) {
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

  const srcDir = path.resolve(import.meta.dir, binaryName);
  if (fs.existsSync(srcDir)) {
    dllPath = srcDir;
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

  throw new Error(`Cannot find native library: ${binaryName}. Set BUNTUI_DLL env or ensure the binary is in the search path.`);
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
