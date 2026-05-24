import {type Pointer, ptr} from 'bun:ffi';
import {createOffsetCalculator} from '../../utils/ffi';
import type {CStruct} from '../types';
import TuiDataViewWrapper from '../TuiDataViewWrapper';

export const TuiResizeBehavior = {
  Fixed: 0,
  Auto: 1,
} as const;
export type TuiResizeBehavior = Enum<typeof TuiResizeBehavior>;

const OFFSET_COUNTER = createOffsetCalculator();
const OFFSETS = Object.freeze({
  tick: OFFSET_COUNTER.mark('u64'),
  x: OFFSET_COUNTER.mark('u16'),
  y: OFFSET_COUNTER.mark('u16'),
  rows: OFFSET_COUNTER.mark('u16'),
  cols: OFFSET_COUNTER.mark('u16'),
  resizeBehavior: OFFSET_COUNTER.mark('u8'),
  debugMode: OFFSET_COUNTER.mark('u8'),
});
export class TuiContext implements CStruct {
  readonly #ptr: Pointer;
  readonly #dataView: TuiDataViewWrapper;

  constructor() {
    const buffer = new ArrayBuffer(OFFSET_COUNTER.currentOffset);
    this.#ptr = ptr(buffer);
    const dataView = new TuiDataViewWrapper(buffer);
    this.#dataView = dataView;
    dataView.setBigUint64(OFFSETS.tick, 0n, true);
    dataView.setUint16(OFFSETS.x, 0, true);
    dataView.setUint16(OFFSETS.y, 0, true);
    dataView.setUint16(OFFSETS.rows, 0, true);
    dataView.setUint16(OFFSETS.cols, 0, true);
    dataView.setUint8(OFFSETS.resizeBehavior, TuiResizeBehavior.Auto);
    dataView.setBool(OFFSETS.debugMode, false);
  }

  get ptr() {
    return this.#ptr;
  }

  get tick() {
    return this.#dataView.getBigUint64(OFFSETS.tick, true);
  }

  get x() {
    return this.#dataView.getUint16(OFFSETS.x, true);
  }

  set x(value: number) {
    this.#dataView.setUint16(OFFSETS.x, value, true);
  }

  get y() {
    return this.#dataView.getUint16(OFFSETS.y, true);
  }

  set y(value: number) {
    this.#dataView.setUint16(OFFSETS.y, value, true);
  }

  get rows() {
    return this.#dataView.getUint16(OFFSETS.rows, true);
  }

  set rows(value: number) {
    this.#dataView.setUint16(OFFSETS.rows, value, true);
  }

  get cols() {
    return this.#dataView.getUint16(OFFSETS.cols, true);
  }

  set cols(value: number) {
    this.#dataView.setUint16(OFFSETS.cols, value, true);
  }

  get resizeBehavior(): TuiResizeBehavior {
    return this.#dataView.getUint8(OFFSETS.resizeBehavior) as TuiResizeBehavior;
  }

  set resizeBehavior(value: TuiResizeBehavior) {
    this.#dataView.setUint8(OFFSETS.resizeBehavior, value);
  }

  get debugMode() {
    return this.#dataView.getBool(OFFSETS.debugMode);
  }

  set debugMode(value: BOOL) {
    this.#dataView.setBool(OFFSETS.debugMode, value);
  }
}

export const TUI_CONTEXT_INSTANCE = new TuiContext();

export default TUI_CONTEXT_INSTANCE;
