import type {Pointer} from '../platform/pointer';

export type Disposable = {
  dispose(disposeWidgets?: boolean): void | Promise<void>;
  [Symbol.dispose](): void;
  [Symbol.asyncDispose](): void;
};

export type CStruct = {
  readonly ptr: Pointer;
  setPtr?: never;
};

export type Entity = {
  readonly id: bigint;
  setId?: never;
};

export type Mountable = {
  mounted(): void;
  unmounted(): void;
};

export type DataType
  = | 'u8'
    | 'i8'
    | 'u16'
    | 'i16'
    | 'u32'
    | 'i32'
    | 'u64'
    | 'i64'
    | 'f32'
    | 'f64'
    | 'pointer'
    | 'bool';
