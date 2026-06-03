export type Pointer = number;

type PtrFn = (buffer: ArrayBuffer | ArrayBufferView) => Pointer;

let _ptrFn: PtrFn = () => 0;

export function setPtr(fn: PtrFn): void {
  _ptrFn = fn;
}

export function ptr(buffer: ArrayBuffer | ArrayBufferView): Pointer {
  return _ptrFn(buffer);
}
