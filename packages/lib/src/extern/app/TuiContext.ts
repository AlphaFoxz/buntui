import {type Pointer, ptr} from 'bun:ffi';
import {Bool, useOffsetCounter} from '../../utils/ffi';
import type {CStruct} from '../types';
import TuiDataView from '../TuiDataViewWrapper';

export enum TuiResizeBehavior {
  Fixed = 0,
  Auto = 1,
}

const OFFSET_COUNTER = useOffsetCounter();
export class TuiContext implements CStruct {
  static readonly OFFSETS = Object.freeze({
    x: OFFSET_COUNTER.mark('u16'),
    y: OFFSET_COUNTER.mark('u16'),
    rows: OFFSET_COUNTER.mark('u16'),
    cols: OFFSET_COUNTER.mark('u16'),
    resizeBehavior: OFFSET_COUNTER.mark('u8'),
    debugMode: OFFSET_COUNTER.mark('u8'),
  });

  readonly #ptr: Pointer;
  readonly #dataView: TuiDataView;

  constructor() {
    const buffer = new ArrayBuffer(OFFSET_COUNTER.currentOffset);
    this.#ptr = ptr(buffer);
    const dateView = new TuiDataView(buffer);
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

  set x(value: number) {
    this.#dataView.setUint16(TuiContext.OFFSETS.x, value, true);
  }

  get y() {
    return this.#dataView.getUint16(TuiContext.OFFSETS.y, true);
  }

  set y(value: number) {
    this.#dataView.setUint16(TuiContext.OFFSETS.y, value, true);
  }

  get rows() {
    return this.#dataView.getUint16(TuiContext.OFFSETS.rows, true);
  }

  set rows(value: number) {
    this.#dataView.setUint16(TuiContext.OFFSETS.rows, value, true);
  }

  get cols() {
    return this.#dataView.getUint16(TuiContext.OFFSETS.cols, true);
  }

  set cols(value: number) {
    this.#dataView.setUint16(TuiContext.OFFSETS.cols, value, true);
  }

  get resizeBehavior() {
    return this.#dataView.getUint8(TuiContext.OFFSETS.resizeBehavior);
  }

  set resizeBehavior(value: TuiResizeBehavior) {
    this.#dataView.setUint8(TuiContext.OFFSETS.resizeBehavior, value);
  }

  get debugMode() {
    return this.#dataView.getBool(TuiContext.OFFSETS.debugMode);
  }

  set debugMode(value: BOOL) {
    this.#dataView.setBool(TuiContext.OFFSETS.debugMode, value);
  }
}

export default TuiContext;
