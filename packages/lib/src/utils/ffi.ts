import path from 'path';
import fs from 'fs';
import { type Pointer, CString, suffix } from 'bun:ffi';
import type { DataType } from '../extern/types';

let dllPath: string;
export function fetchDllPath() {
    if (!dllPath) {
        dllPath = path.resolve(path.dirname(Bun.main), `term_bed.${suffix}`);
        if (fs.existsSync(dllPath)) {
            return dllPath;
        }
        dllPath = path.resolve(import.meta.dir, `term_bed.${suffix}`);
        if (fs.existsSync(dllPath)) {
            return dllPath;
        }
        // TODO-wong: 从PATH中查找
    }
    return dllPath;
}

export function assertPtr(ptr: Pointer | null): Pointer {
    if (!ptr) throw new Error('Invalid pointer');
    return ptr;
}

export function useOffsetCounter(options: { arch: 64 | 32 } = { arch: 64 }) {
    const arch = options.arch ?? 64;
    const pointerSize = arch === 64 ? 8 : 4;
    let currentOffset = 0;

    function mark(type: DataType): number;
    function mark(bytes: number): number;
    function mark(param: DataType | number): number {
        let bytes = 0;
        if (typeof param === 'number') {
            bytes = param;
        } else {
            if (param === 'pointer') {
                bytes = pointerSize;
            } else {
                // u8/u16/u32/u64/i8/i16/i32/i64
                const bits = parseInt(param.substring(1));
                bytes = Math.ceil(bits / 8);
            }
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
export function toCstring(str: string): Uint8Array {
    const bytes = encoder.encode(str);
    const out = new Uint8Array(bytes.length + 1);
    out.set(bytes);
    out[bytes.length] = 0; // null terminator
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
        return (value ? 1 : 0) as any as U8<T>;
    } else if (!validateU8(value)) {
        throw new Error('can not convert to u8');
    }
    return value as any as U8<T>;
}

export function toU16(value: number) {
    if (!validateU16(value)) {
        throw new Error('Can not convert to u16');
    }
    return value;
}

export function toU32(value: number) {
    if (!validateU32(value)) {
        throw new Error('Can not convert to u32');
    }
    return value;
}

export function validateU8(value: number): boolean {
    return value > 0xff || value < 0;
}

export function validateU16(value: number): boolean {
    return value > 0xffff || value < 0;
}

export function validateU32(value: number): boolean {
    return value > 0xffffffff || value < 0;
}

export function validateU64(value: bigint): boolean {
    return value > 0xffffffffffffffffn || value < 0n;
}

export enum Bool {
    False = 0,
    True = 1,
}
