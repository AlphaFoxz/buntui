import type {Pointer} from '../platform/pointer';
import {Bool} from '../utils/ffi';
import {ptrFromNumber} from '../utils/pointer';

export class TuiDataViewWrapper {
  readonly #inner: DataView;

  constructor(
    buffer: ArrayBufferLike & {BYTES_PER_ELEMENT?: never},
    byteOffset?: number,
    byteLength?: number,
  ) {
    // eslint-disable-next-line no-restricted-globals
    this.#inner = new DataView(buffer, byteOffset, byteLength);
  }

  get byteLength() {
    return this.#inner.byteLength;
  }

  getFloat32(byteOffset: number, isLittleEndian?: boolean) {
    return this.#inner.getFloat32(byteOffset, isLittleEndian);
  }

  getFloat64(byteOffset: number, isLittleEndian?: boolean) {
    return this.#inner.getFloat64(byteOffset, isLittleEndian);
  }

  getInt8(byteOffset: number) {
    return this.#inner.getInt8(byteOffset);
  }

  getInt16(byteOffset: number, isLittleEndian?: boolean) {
    return this.#inner.getInt16(byteOffset, isLittleEndian);
  }

  getInt32(byteOffset: number, isLittleEndian?: boolean) {
    return this.#inner.getInt32(byteOffset, isLittleEndian);
  }

  getUint8(byteOffset: number) {
    return this.#inner.getUint8(byteOffset);
  }

  getUint16(byteOffset: number, isLittleEndian?: boolean) {
    return this.#inner.getUint16(byteOffset, isLittleEndian);
  }

  getUint32(byteOffset: number, isLittleEndian?: boolean) {
    return this.#inner.getUint32(byteOffset, isLittleEndian);
  }

  setFloat32(byteOffset: number, value: number, isLittleEndian?: boolean) {
    this.#inner.setFloat32(byteOffset, value, isLittleEndian);
  }

  setFloat64(byteOffset: number, value: number, isLittleEndian?: boolean) {
    this.#inner.setFloat64(byteOffset, value, isLittleEndian);
  }

  setInt8(byteOffset: number, value: number) {
    this.#inner.setInt8(byteOffset, value);
  }

  setInt16(byteOffset: number, value: number, isLittleEndian?: boolean) {
    this.#inner.setInt16(byteOffset, value, isLittleEndian);
  }

  setInt32(byteOffset: number, value: number, isLittleEndian?: boolean) {
    this.#inner.setInt32(byteOffset, value, isLittleEndian);
  }

  setUint8(byteOffset: number, value: number) {
    this.#inner.setUint8(byteOffset, value);
  }

  setUint16(byteOffset: number, value: number, isLittleEndian?: boolean) {
    this.#inner.setUint16(byteOffset, value, isLittleEndian);
  }

  setUint32(byteOffset: number, value: number, isLittleEndian?: boolean) {
    this.#inner.setUint32(byteOffset, value, isLittleEndian);
  }

  getBigInt64(byteOffset: number, isLittleEndian?: boolean) {
    return this.#inner.getBigInt64(byteOffset, isLittleEndian);
  }

  getBigUint64(byteOffset: number, isLittleEndian?: boolean) {
    return this.#inner.getBigUint64(byteOffset, isLittleEndian);
  }

  setBigInt64(byteOffset: number, value: bigint, isLittleEndian?: boolean) {
    this.#inner.setBigInt64(byteOffset, value, isLittleEndian);
  }

  setBigUint64(byteOffset: number, value: bigint, isLittleEndian?: boolean) {
    this.#inner.setBigUint64(byteOffset, value, isLittleEndian);
  }

  getFloat16(byteOffset: number, isLittleEndian?: boolean) {
    return this.#inner.getFloat16(byteOffset, isLittleEndian);
  }

  setFloat16(byteOffset: number, value: number, isLittleEndian?: boolean) {
    this.#inner.setFloat16(byteOffset, value, isLittleEndian);
  }

  setPointer(byteOffset: number, value: Pointer) {
    this.#inner.setBigUint64(byteOffset, BigInt(value), true);
  }

  getPointer(byteOffset: number): Pointer {
    return ptrFromNumber(Number(this.#inner.getBigUint64(byteOffset, true)));
  }

  getBool(byteOffset: number) {
    const value = this.#inner.getUint8(byteOffset);
    if (value !== 1 && value !== 0) {
      throw new Error(`Invalid boolean value: ${value}`);
    }

    return value !== 0;
  }

  setBool(byteOffset: number, isSet: boolean) {
    this.#inner.setUint8(byteOffset, isSet ? Bool.True : Bool.False);
  }

  get [Symbol.toStringTag]() {
    return this.#inner[Symbol.toStringTag];
  }
}

export default TuiDataViewWrapper;

