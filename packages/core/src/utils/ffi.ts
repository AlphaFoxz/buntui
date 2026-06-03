import type {DataType} from '../extern/types';

export type OffsetCounterOptions = {arch?: 64 | 32};
export function createOffsetCalculator(options: OffsetCounterOptions = {}) {
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

    const padding = (alignment - (currentOffset % alignment)) % alignment;

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
export function toCstring(text: string): Uint8Array {
  const bytes = encoder.encode(text);
  const out = new Uint8Array(bytes.length + 1);
  out.set(bytes);
  out[bytes.length] = 0; // Null terminator
  return out;
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
    return (value ? 1 : 0) as U8<T>;
  }

  if (isOutOfRangeU8(value)) {
    throw new Error('can not convert to u8');
  }

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
