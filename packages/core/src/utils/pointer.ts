import type {Pointer} from '../platform/pointer';

export function ptrOffset(base: Pointer, delta: number): Pointer {
  return (Number(base) + delta);
}

// eslint-disable-next-line unicorn/prefer-native-coercion-functions
export function ptrFromNumber(value: number | bigint): Pointer {
  return Number(value);
}
