export {};

declare global {
  function assertNever(...args: never[]): never;

  type U8 = number & {};
  type U16 = number & {};
  type U32 = number & {};
  type U64 = (bigint | number) & {};
  type I8 = number & {};
  type I16 = number & {};
  type I32 = number & {};
  type I64 = (bigint | number) & {};
  type BOOL = boolean;

  type Enum<T extends Record<string, unknown>> = T[keyof T];
}

// XXX Temporary repair
/**
 @see {@link https://github.com/oven-sh/bun/issues/32340#issuecomment-4713458265 }
 */
declare module 'node:util' {
  export type TextEncoderEncodeIntoResult = {
    read: number;
    written: number;
  };
}
