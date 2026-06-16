import {it, expect, describe} from 'bun:test';
import {getClipboard, setClipboard, setPasteBuffer} from '../index';
import type {ClipboardProvider} from '../types';

function makeStubProvider(value = 'stub'): ClipboardProvider & {written: string[]} {
  const written: string[] = [];
  return {
    read() {
      return value;
    },
    write(text: string) {
      written.push(text);
    },
    written,
  };
}

describe('setClipboard / getClipboard', () => {
  it('getClipboard returns the provider installed by setClipboard', () => {
    const stub = makeStubProvider();
    const previous = setClipboard(stub);
    expect(getClipboard()).toBe(stub);
    setClipboard(previous ?? makeStubProvider());
  });

  it('setClipboard returns the previous provider', () => {
    const first = makeStubProvider();
    const second = makeStubProvider();
    const previous = setClipboard(first);
    const returned = setClipboard(second);
    expect(returned).toBe(first);
    setClipboard(previous ?? makeStubProvider());
  });

  it('getClipboard returns a stable reference across calls (cached)', () => {
    const stub = makeStubProvider();
    const previous = setClipboard(stub);
    expect(getClipboard()).toBe(getClipboard());
    setClipboard(previous ?? makeStubProvider());
  });

  it('getClipboard re-initializes after setting a new provider', () => {
    const first = makeStubProvider('a');
    const second = makeStubProvider('b');
    const previous = setClipboard(first);
    expect(getClipboard().read()).toBe('a');
    setClipboard(second);
    expect(getClipboard().read()).toBe('b');
    setClipboard(previous ?? makeStubProvider());
  });

  it('delegates write to the installed provider', () => {
    const stub = makeStubProvider();
    const previous = setClipboard(stub);
    getClipboard().write('hello');
    expect(stub.written).toEqual(['hello']);
    setClipboard(previous ?? makeStubProvider());
  });
});

describe('setPasteBuffer', () => {
  it('does not throw and accepts any string', () => {
    expect(() => setPasteBuffer('anything')).not.toThrow();
    expect(() => setPasteBuffer('')).not.toThrow();
  });
});
