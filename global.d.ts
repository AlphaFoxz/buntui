export {};

declare global {
    declare function isNever(...args: never[]): void;
    type U8 = number & {};
    type U16 = number & {};
    type U32 = number & {};
    type U64 = bigint & {};
    type I8 = number & {};
    type I16 = number & {};
    type I32 = number & {};
    type I64 = bigint & {};
    /**
     * Bool is alias of U8, 0 is false, 1 is true
     */
    type BOOL = U8;
}
