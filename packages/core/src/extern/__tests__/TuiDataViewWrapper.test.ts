import {it, expect, describe} from 'bun:test';
import {ptr} from 'bun:ffi';
import {TuiDataViewWrapper} from '../TuiDataViewWrapper';

describe('basic wrapping', () => {
  it('wraps an ArrayBuffer', () => {
    const buffer = new ArrayBuffer(16);
    const dv = new TuiDataViewWrapper(buffer);
    expect(dv.byteLength).toBe(16);
  });
});

describe('bool operations', () => {
  it('setBool/getBool roundtrip true', () => {
    const dv = new TuiDataViewWrapper(new ArrayBuffer(8));
    dv.setBool(0, true);
    expect(dv.getBool(0)).toBe(true);
  });

  it('setBool/getBool roundtrip false', () => {
    const dv = new TuiDataViewWrapper(new ArrayBuffer(8));
    dv.setBool(0, false);
    expect(dv.getBool(0)).toBe(false);
  });

  it('getBool throws on invalid value', () => {
    const buffer = new ArrayBuffer(8);
    new Uint8Array(buffer)[0] = 42;
    const dv = new TuiDataViewWrapper(buffer);
    expect(() => dv.getBool(0)).toThrow(/Invalid boolean value/);
  });
});

describe('pointer operations', () => {
  it('setPointer/getPointer roundtrip', () => {
    const buf = new ArrayBuffer(16);
    const dv = new TuiDataViewWrapper(buf);
    const p = ptr(buf);
    dv.setPointer(0, p);
    expect(dv.getPointer(0) === p).toBe(true);
  });
});

describe('float16 operations', () => {
  it('setFloat16/getFloat16 roundtrip', () => {
    const dv = new TuiDataViewWrapper(new ArrayBuffer(16));
    dv.setFloat16(0, 1.5, true);
    expect(dv.getFloat16(0, true)).toBeCloseTo(1.5, 2);
  });
});

describe('int8/int16/int32 operations', () => {
  it('setInt8/getInt8 roundtrip', () => {
    const dv = new TuiDataViewWrapper(new ArrayBuffer(16));
    dv.setInt8(0, -42);
    expect(dv.getInt8(0)).toBe(-42);
  });

  it('setInt16/getInt16 roundtrip', () => {
    const dv = new TuiDataViewWrapper(new ArrayBuffer(16));
    dv.setInt16(0, -1000, true);
    expect(dv.getInt16(0, true)).toBe(-1000);
  });

  it('setInt32/getInt32 roundtrip', () => {
    const dv = new TuiDataViewWrapper(new ArrayBuffer(16));
    dv.setInt32(0, -100000, true);
    expect(dv.getInt32(0, true)).toBe(-100000);
  });
});

describe('float32/float64 operations', () => {
  it('setFloat32/getFloat32 roundtrip', () => {
    const dv = new TuiDataViewWrapper(new ArrayBuffer(16));
    dv.setFloat32(0, 3.14, true);
    expect(dv.getFloat32(0, true)).toBeCloseTo(3.14, 5);
  });

  it('setFloat64/getFloat64 roundtrip', () => {
    const dv = new TuiDataViewWrapper(new ArrayBuffer(16));
    dv.setFloat64(0, 2.718, true);
    expect(dv.getFloat64(0, true)).toBeCloseTo(2.718, 10);
  });
});

describe('bigint operations', () => {
  it('setBigInt64/getBigInt64 roundtrip', () => {
    const dv = new TuiDataViewWrapper(new ArrayBuffer(16));
    dv.setBigInt64(0, -123n, true);
    expect(dv.getBigInt64(0, true)).toBe(-123n);
  });

  it('setBigUint64/getBigUint64 roundtrip', () => {
    const dv = new TuiDataViewWrapper(new ArrayBuffer(16));
    dv.setBigUint64(0, 9007199254740991n, true);
    expect(dv.getBigUint64(0, true)).toBe(9007199254740991n);
  });
});

describe('Symbol.toStringTag', () => {
  it('returns DataView tag', () => {
    const dv = new TuiDataViewWrapper(new ArrayBuffer(8));
    expect(dv[Symbol.toStringTag]).toBe('DataView');
  });
});

