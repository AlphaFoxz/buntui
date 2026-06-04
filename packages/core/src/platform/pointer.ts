export type Pointer = number;

type PtrFn = (buffer: ArrayBuffer | ArrayBufferView) => Pointer;

let _ptrFn: PtrFn | undefined;

let _ptrWarned = false;

export function setPtr(fn: PtrFn): void {
  _ptrFn = fn;
}

export function ptr(buffer: ArrayBuffer | ArrayBufferView): Pointer {
  if (!_ptrFn) {
    if (!_ptrWarned) {
      console.warn('[buntui] ptr() called without FFI initialization. This is expected in browser environments. Returning 0.');
      _ptrWarned = true;
    }

    return 0;
  }

  return _ptrFn(buffer);
}
