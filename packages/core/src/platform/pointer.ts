export type Pointer = number;

type PtrFn = (buffer: ArrayBuffer | ArrayBufferView) => Pointer;

let _ptrFn: PtrFn | undefined;

let _isPtrWarned = false;

export function setPtr(fn: PtrFn): void {
  _ptrFn = fn;
}

export function ptr(buffer: ArrayBuffer | ArrayBufferView): Pointer {
  if (!_ptrFn) {
    if (!_isPtrWarned) {
      console.warn('[buntui] ptr() called without FFI initialization. This is expected in browser environments. Returning 0.');
      _isPtrWarned = true;
    }

    return 0;
  }

  return _ptrFn(buffer);
}
