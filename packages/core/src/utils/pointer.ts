import {type Pointer} from 'bun:ffi';

export function ptrOffset(base: Pointer, delta: number): Pointer {
  return (base + delta) as Pointer;
}

export function ptrFromNumber(value: number | bigint): Pointer {
  return value as Pointer;
}
