import {type Pointer} from 'bun:ffi';
import {Bool} from '../utils/ffi';

export class TuiDataViewWrapper {
  readonly #inner: DataView;

  constructor(
    buffer: ArrayBufferLike & {BYTES_PER_ELEMENT?: never},
    byteOffset?: number,
    byteLength?: number,
  ) {
    this.#inner = new globalThis.DataView(buffer, byteOffset, byteLength);
  }

  get dataView() {
    return this.#inner;
  }

  getFloat32(byteOffset: number, littleEndian?: boolean) {
    return this.#inner.getFloat32(byteOffset, littleEndian);
  }

  getFloat64(byteOffset: number, littleEndian?: boolean) {
    return this.#inner.getFloat64(byteOffset, littleEndian);
  }

  getInt8(byteOffset: number) {
    return this.#inner.getInt8(byteOffset);
  }

  getInt16(byteOffset: number, littleEndian?: boolean) {
    return this.#inner.getInt16(byteOffset, littleEndian);
  }

  getInt32(byteOffset: number, littleEndian?: boolean) {
    return this.#inner.getInt32(byteOffset, littleEndian);
  }

  getUint8(byteOffset: number) {
    return this.#inner.getUint8(byteOffset);
  }

  getUint16(byteOffset: number, littleEndian?: boolean) {
    return this.#inner.getUint16(byteOffset, littleEndian);
  }

  getUint32(byteOffset: number, littleEndian?: boolean) {
    return this.#inner.getUint32(byteOffset, littleEndian);
  }

  setFloat32(byteOffset: number, value: number, littleEndian?: boolean) {
    this.#inner.setFloat32(byteOffset, value, littleEndian);
  }

  setFloat64(byteOffset: number, value: number, littleEndian?: boolean) {
    this.#inner.setFloat64(byteOffset, value, littleEndian);
  }

  setInt8(byteOffset: number, value: number) {
    this.#inner.setInt8(byteOffset, value);
  }

  setInt16(byteOffset: number, value: number, littleEndian?: boolean) {
    this.#inner.setInt16(byteOffset, value, littleEndian);
  }

  setInt32(byteOffset: number, value: number, littleEndian?: boolean) {
    this.#inner.setInt32(byteOffset, value, littleEndian);
  }

  setUint8(byteOffset: number, value: number) {
    this.#inner.setUint8(byteOffset, value);
  }

  setUint16(byteOffset: number, value: number, littleEndian?: boolean) {
    this.#inner.setUint16(byteOffset, value, littleEndian);
  }

  setUint32(byteOffset: number, value: number, littleEndian?: boolean) {
    this.#inner.setUint32(byteOffset, value, littleEndian);
  }

  getBigInt64(byteOffset: number, littleEndian?: boolean) {
    return this.#inner.getBigInt64(byteOffset, littleEndian);
  }

  getBigUint64(byteOffset: number, littleEndian?: boolean) {
    return this.#inner.getBigUint64(byteOffset, littleEndian);
  }

  setBigInt64(byteOffset: number, value: bigint, littleEndian?: boolean) {
    this.#inner.setBigInt64(byteOffset, value, littleEndian);
  }

  setBigUint64(byteOffset: number, value: bigint, littleEndian?: boolean) {
    this.#inner.setBigUint64(byteOffset, value, littleEndian);
  }

  getFloat16(byteOffset: number, littleEndian?: boolean) {
    return this.#inner.getFloat16(byteOffset, littleEndian);
  }

  setFloat16(byteOffset: number, value: number, littleEndian?: boolean) {
    this.#inner.setFloat16(byteOffset, value, littleEndian);
  }

  setPointer(byteOffset: number, value: Pointer) {
    this.#inner.setBigUint64(byteOffset, BigInt(value), true);
  }

  getPointer(byteOffset: number): Pointer {
    return Number(this.#inner.getBigUint64(byteOffset, true)) as Pointer;
  }

  getBool(byteOffset: number) {
    const value = this.#inner.getUint8(byteOffset);
    if (value !== 1 && value !== 0) {
      throw new Error(`Invalid boolean value: ${value}`);
    }

    return this.#inner.getUint8(byteOffset) !== 0;
  }

  setBool(byteOffset: number, value: boolean) {
    this.#inner.setUint8(byteOffset, value ? Bool.True : Bool.False);
  }

  get [Symbol.toStringTag]() {
    return this.#inner[Symbol.toStringTag];
  }
}

export default TuiDataViewWrapper;

