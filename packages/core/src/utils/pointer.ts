import {type Pointer} from 'bun:ffi';

export function ptrOffset(base: Pointer, delta: number): Pointer {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- branded type requires recast from number
  return (base + delta) as Pointer;
}

export function ptrFromNumber(value: number | bigint): Pointer {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- branded type requires recast from number
  return value as Pointer;
}
