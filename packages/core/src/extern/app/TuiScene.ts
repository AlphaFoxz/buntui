import {
  type Pointer, toArrayBuffer,
} from 'bun:ffi';
import {genId} from '../../utils/genId';
import {rgbToRgba} from '../../utils/styles';
import type {CStruct} from '../types';
import TuiDataViewWrapper from '../TuiDataViewWrapper';
import {useOffsetCounter} from '../../utils/ffi';
import {type TuiWidgetEntity} from '../widgets/TuiWidgetEntity';
import {type TuiSceneOptions} from './types';
import app from './lib';

const OFFSET_COUNTER = useOffsetCounter();
const OFFSETS = {
  bgRgba: OFFSET_COUNTER.mark('u32'),
  widgets: OFFSET_COUNTER.mark('pointer'),
  sorted: OFFSET_COUNTER.mark('bool'),
};
export class TuiScene implements CStruct {
  readonly #id: bigint;
  readonly #ptr: Pointer;
  readonly #dataView: TuiDataViewWrapper;
  #visible: boolean;
  readonly #widgets = new Set<TuiWidgetEntity>();

  constructor(options?: Partial<TuiSceneOptions>) {
    this.#id = genId();
    this.#visible = options?.visible ?? false;
    let bgRgba: number;
    if (typeof options?.bgHexRgb === 'string' || typeof options?.bgHexRgb === 'number') {
      bgRgba = rgbToRgba(options.bgHexRgb);
    } else if (options?.bgHexRgb === undefined) {
      bgRgba = rgbToRgba('#000000');
    } else {
      bgRgba = rgbToRgba(options.bgHexRgb);
    }

    this.#ptr = app.createScene(bgRgba);
    const buffer = toArrayBuffer(this.#ptr, 0, OFFSET_COUNTER.currentOffset);
    this.#dataView = new TuiDataViewWrapper(buffer);
  }

  mount(widget: TuiWidgetEntity) {
    app.mountWidgetEntity(this, widget);
    this.#widgets.add(widget);
    widget.mounted();
    return this;
  }

  unmount(widget: TuiWidgetEntity) {
    app.unmountWidgetEntity(this, widget);
    this.#widgets.delete(widget);
    widget.unmounted();
    return this;
  }

  get id() {
    return this.#id;
  }

  get ptr() {
    return this.#ptr;
  }

  get bgHexRgb() {
    return this.#dataView.getUint32(OFFSETS.bgRgba) >> 8;
  }

  setBgRgb(hexRgb: number | string): void;
  setBgRgb(r: number, g: number, b: number): void;
  setBgRgb(rgbColor: {r: number; g: number; b: number}): void;
  setBgRgb(
    color: {r: number; g: number; b: number} | string | number,
    g?: number,
    b?: number,
  ): void {
    let value: number;
    if (typeof color === 'object') {
      value = rgbToRgba(color);
    } else if (typeof color === 'number' && typeof g === 'number' && typeof b === 'number') {
      value = rgbToRgba(color, g, b);
    } else {
      value = rgbToRgba(color);
    }

    this.#dataView.setUint32(OFFSETS.bgRgba, value, true);
  }

  get visible() {
    return this.#visible;
  }

  setVisible(visible: boolean) {
    this.#visible = visible;
  }

  destroy() {
    for (const widget of this.#widgets) {
      this.unmount(widget);
    }

    app.destroyScene(this);
  }
}

export default TuiScene;
