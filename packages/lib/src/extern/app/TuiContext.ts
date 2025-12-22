import { type Pointer, ptr } from 'bun:ffi';
import { Bool, toU8, useOffsetCounter } from '../../utils/ffi';
import type { CStruct } from '../types';

export enum TuiResizeBehavior {
    Fixed = 0,
    Auto = 1,
}

export class TuiContext implements CStruct {
    #ptr: Pointer;
    #dataView: DataView;
    static readonly #OFFSET_COUNTER = useOffsetCounter();
    static readonly OFFSETS = Object.freeze({
        x: this.#OFFSET_COUNTER.mark('u16'),
        y: this.#OFFSET_COUNTER.mark('u16'),
        rows: this.#OFFSET_COUNTER.mark('u16'),
        cols: this.#OFFSET_COUNTER.mark('u16'),
        resizeBehavior: this.#OFFSET_COUNTER.mark('u8'),
        debugMode: this.#OFFSET_COUNTER.mark('u8'),
    });
    constructor() {
        const buffer = new ArrayBuffer(TuiContext.#OFFSET_COUNTER.currentOffset);
        this.#ptr = ptr(buffer);
        const dateView = new DataView(buffer);
        this.#dataView = dateView;
        dateView.setUint16(TuiContext.OFFSETS.x, 0, true);
        dateView.setUint16(TuiContext.OFFSETS.y, 0, true);
        dateView.setUint16(TuiContext.OFFSETS.rows, 0, true);
        dateView.setUint16(TuiContext.OFFSETS.cols, 0, true);
        dateView.setUint8(TuiContext.OFFSETS.resizeBehavior, TuiResizeBehavior.Auto);
        dateView.setUint8(TuiContext.OFFSETS.debugMode, Bool.False);
    }

    get ptr() {
        return this.#ptr;
    }
    get x() {
        return this.#dataView.getUint16(TuiContext.OFFSETS.x, true);
    }
    get y() {
        return this.#dataView.getUint16(TuiContext.OFFSETS.y, true);
    }
    get rows() {
        return this.#dataView.getUint16(TuiContext.OFFSETS.rows, true);
    }
    get cols() {
        return this.#dataView.getUint16(TuiContext.OFFSETS.cols, true);
    }
    get resizeBehavior() {
        return this.#dataView.getUint8(TuiContext.OFFSETS.resizeBehavior);
    }
    set x(value: number) {
        this.#dataView.setUint16(TuiContext.OFFSETS.x, value, true);
    }
    set y(value: number) {
        this.#dataView.setUint16(TuiContext.OFFSETS.y, value, true);
    }
    set rows(value: number) {
        this.#dataView.setUint16(TuiContext.OFFSETS.rows, value, true);
    }
    set cols(value: number) {
        this.#dataView.setUint16(TuiContext.OFFSETS.cols, value, true);
    }
    set resizeBehavior(value: TuiResizeBehavior) {
        this.#dataView.setUint8(TuiContext.OFFSETS.resizeBehavior, value);
    }
    set debugMode(value: Bool) {
        this.#dataView.setUint8(
            TuiContext.OFFSETS.debugMode,
            value ? toU8(Bool.True) : toU8(Bool.False)
        );
    }
}

export default TuiContext;
