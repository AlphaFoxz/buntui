import { type Pointer, ptr } from 'bun:ffi';
import { useOffsetCounter } from '../../utils/ffi';

export class TuiCell {
    #dataView: DataView;
    #ptr: Pointer;
    static readonly #OFFSET_COUNTER = useOffsetCounter();
    static readonly OFFSETS = {
        cellType: this.#OFFSET_COUNTER.mark('u16'),
        text: this.#OFFSET_COUNTER.mark('u16'),
        fg: this.#OFFSET_COUNTER.mark('u32'),
        bg: this.#OFFSET_COUNTER.mark('u32'),
        style: this.#OFFSET_COUNTER.mark('u32'),
    };
    constructor() {
        const buffer = new ArrayBuffer(TuiCell.#OFFSET_COUNTER.currentOffset);
        this.#ptr = ptr(buffer);
        this.#dataView = new DataView(buffer);
    }
}

export default TuiCell;
