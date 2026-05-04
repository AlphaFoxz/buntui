import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import {type Pointer, CString, suffix} from 'bun:ffi';
import type {DataType} from '../extern/types';

let dllPath: string | undefined;

export function setDllPath(p: string) {
  dllPath = p;
}

export function fetchDllPath(): string {
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

export function assertPtr(ptr: Pointer | null): Pointer {
  if (ptr === null || ptr === undefined) {
    throw new Error('Invalid pointer');
  }

  return ptr;
}

export type OffsetCounterOptions = {arch?: 64 | 32};
export function useOffsetCounter(options: OffsetCounterOptions = {}) {
  const arch = options.arch ?? 64;
  const pointerSize = arch === 64 ? 8 : 4;
  let currentOffset = 0;

  function mark(type: DataType): number;
  function mark(bytes: number): number;
  function mark(parameter: DataType | number): number {
    let bytes = 0;
    if (typeof parameter === 'number') {
      bytes = parameter;
    } else if (parameter === 'pointer') {
      bytes = pointerSize;
    } else if (parameter === 'bool') {
      bytes = 1;
    } else {
      // U8/u16/u32/u64/i8/i16/i32/i64
      const bits = Number.parseInt(parameter.slice(1), 10);
      bytes = Math.ceil(bits / 8);
    }

    const alignment = Math.min(bytes, pointerSize);

    // 计算 padding：当前偏移对齐值的余数
    const padding = (alignment - (currentOffset % alignment)) % alignment;

    // 跳过 padding 字节
    currentOffset += padding;

    const offset = currentOffset;
    currentOffset += bytes;

    return offset;
  }

  return {
    get currentOffset() {
      return currentOffset;
    },
    get arch() {
      return arch;
    },
    mark,
  };
}

const encoder = new TextEncoder('utf-8');
export function toCstring(string_: string): Uint8Array {
  const bytes = encoder.encode(string_);
  const out = new Uint8Array(bytes.length + 1);
  out.set(bytes);
  out[bytes.length] = 0; // Null terminator
  return out;
}

export function cToString(ptr: Pointer, length: number): string {
  return new CString(ptr, 0, length).toString();
}

export type U8<T extends boolean | number> = T extends number
  ? number
  : T extends true
    ? 1
    : T extends false
      ? 0
      : never;

export function toU8<T extends boolean | number>(value: T): U8<T> {
  if (typeof value === 'boolean') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- conditional type U8<T> cannot be inferred from literal
    return (value ? 1 : 0) as U8<T>;
  }

  if (isOutOfRangeU8(value)) {
    throw new Error('can not convert to u8');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- conditional type U8<T> cannot be inferred from number
  return value as unknown as U8<T>;
}

export function toU16(value: number) {
  if (isOutOfRangeU16(value)) {
    throw new Error('Can not convert to u16');
  }

  return value;
}

export function toU32(value: number) {
  if (isOutOfRangeU32(value)) {
    throw new Error('Can not convert to u32');
  }

  return value;
}

export function isOutOfRangeU8(value: number): boolean {
  return value > 0xFF || value < 0;
}

export function isOutOfRangeU16(value: number): boolean {
  return value > 0xFF_FF || value < 0;
}

export function isOutOfRangeU32(value: number): boolean {
  return value > 0xFF_FF_FF_FF || value < 0;
}

export function isOutOfRangeU64(value: bigint): boolean {
  return value > 0xFF_FF_FF_FF_FF_FF_FF_FFn || value < 0n;
}

export const Bool = {
  False: 0,
  True: 1,
} as const;
export type Bool = Enum<typeof Bool>;
