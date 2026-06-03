import {ptr} from '../../platform/pointer';
import {ptrOffset} from '../../utils/pointer';

export class SharedStringArena {
  #size: number = 1024 * 1024;
  #buffer: Uint8Array;
  #cursor = 0;
  readonly #encoder = new TextEncoder('utf-8');
  constructor(bytes?: number) {
    this.#size = bytes ?? this.#size;
    this.#buffer = new Uint8Array(this.#size);
  }

  get cursor() {
    return this.#cursor;
  }

  get buffer() {
    return this.#buffer;
  }

  swap(other: SharedStringArena) {
    const newBuffer = other.#buffer;
    const newSize = other.#size;
    const newCursor = other.#cursor;

    other.#buffer = this.#buffer;
    other.#size = this.#size;
    other.#cursor = this.#cursor;

    this.#buffer = newBuffer;
    this.#size = newSize;
    this.#cursor = newCursor;
  }

  reset() {
    this.#cursor = 0;
  }

  allocString(text: string) {
    const remaining = this.#size - this.#cursor;
    if (remaining <= 1) {
      throw new Error('FrameArena: out of memory');
    }

    const dest = this.#buffer.subarray(this.#cursor, this.#size - 1);

    const {written} = this.#encoder.encodeInto(text, dest);

    this.#buffer[this.#cursor + written] = 0;

    const basePtr = ptr(this.#buffer);
    const stringPtr = ptrOffset(basePtr, this.#cursor);
    const stringLength = written;

    this.#cursor += written + 1;
    return {ptr: stringPtr, len: stringLength};
  }
}
export class FrameStringArena {
  readonly #prevFrame: SharedStringArena;
  readonly #nextFrame: SharedStringArena;
  constructor(size: number = 1024 * 1024) {
    this.#prevFrame = new SharedStringArena(size);
    this.#nextFrame = new SharedStringArena(size);
  }

  get prevFrame() {
    return this.#prevFrame;
  }

  get nextFrame() {
    return this.#nextFrame;
  }

  swap() {
    this.#prevFrame.swap(this.#nextFrame);
  }

  allocString(text: string) {
    return this.#nextFrame.allocString(text);
  }

  reset() {
    this.#nextFrame.reset();
  }
}
