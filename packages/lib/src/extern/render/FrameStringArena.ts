import { ArrayBufferSink } from 'bun';
import { type Pointer, ptr } from 'bun:ffi';

export class SharedStringArena {
    #size: number = 1024 * 1024;
    #buffer: Uint8Array;
    #ptr: Pointer;
    #cursor: number = 0;
    #encoder = new TextEncoder('utf-8');
    constructor(bytes?: number) {
        this.#buffer = new Uint8Array(bytes || this.#size);
        this.#ptr = ptr(this.#buffer);
    }

    get cursor() {
        return this.#cursor;
    }

    swap(other: SharedStringArena) {
        const newBuffer = other.#buffer;
        const newSize = other.#size;
        const newPtr = other.#ptr;
        const newCursor = other.#cursor;

        other.#buffer = this.#buffer;
        other.#size = this.#size;
        other.#ptr = this.#ptr;
        other.#cursor = this.#cursor;

        this.#buffer = newBuffer;
        this.#size = newSize;
        this.#ptr = newPtr;
        this.#cursor = newCursor;
    }

    reset() {
        this.#cursor = 0;
    }

    allocString(str: string) {
        const remaining = this.#size - this.#cursor;
        if (remaining <= 1) throw new Error('FrameArena: out of memory');

        const dest = this.#buffer.subarray(this.#cursor, this.#size - 1); // 留一个位置给 \0

        const { written } = this.#encoder.encodeInto(str, dest);

        this.#buffer[this.#cursor + written] = 0;

        const strPtr = (this.#ptr + this.#cursor) as Pointer;
        const strLen = written; // Zig slice 长度不包含 \0

        this.#cursor += written + 1;
        return { ptr: strPtr, len: strLen };
    }
}

export class FrameStringArena {
    #prev_frame: SharedStringArena;
    #next_frame: SharedStringArena;
    constructor() {
        this.#prev_frame = new SharedStringArena(1024 * 1024);
        this.#next_frame = new SharedStringArena(1024 * 1024);
    }

    get prev_frame() {
        return this.#prev_frame;
    }

    get next_frame() {
        return this.#next_frame;
    }

    swap() {
        this.#prev_frame.swap(this.#next_frame);
    }

    allocString(str: string) {
        return this.#next_frame.allocString(str);
    }

    reset() {
        this.#next_frame.reset();
    }
}
