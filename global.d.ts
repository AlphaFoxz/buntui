export {};

declare global {
  declare function isNever(...args: never[]): void;
    type U8 = number & {};
    type U16 = number & {};
    type U32 = number & {};
    type U64 = (bigint | number) & {};
    type I8 = number & {};
    type I16 = number & {};
    type I32 = number & {};
    type I64 = (bigint | number) & {};
    /**
     * @example
     * Bool is alias of U8, false => 0, true => 1
     */
    type BOOL = boolean;
}

