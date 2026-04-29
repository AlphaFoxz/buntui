import {genId} from '../../utils/genId';
import {rgbToRgba} from '../../utils/styles';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type TuiWidgetEntity} from '../widgets/TuiWidgetEntity';
import {type TuiSceneOptions} from './types';

export class TuiScene {
  readonly #id: bigint;
  #visible: boolean;
  #bgRgba: number;
  readonly #widgets = new Set<TuiWidgetEntity>();

  constructor(options?: Partial<TuiSceneOptions>) {
    this.#id = genId();
    this.#visible = options?.visible ?? false;
    this.#bgRgba = rgbToRgba(options?.bgHexRgb ?? '#000000');
  }

  mount(widget: TuiWidgetEntity) {
    this.#widgets.add(widget);
    widget.mounted();
    return this;
  }

  unmount(widget: TuiWidgetEntity) {
    this.#widgets.delete(widget);
    widget.unmounted();
    return this;
  }

  get id() {
    return this.#id;
  }

  get bgHexRgb() {
    return this.#bgRgba >> 8;
  }

  setBgRgb(hexRgb: number | string): void;
  setBgRgb(r: number, g: number, b: number): void;
  setBgRgb(rgbColor: {r: number; g: number; b: number}): void;
  setBgRgb(
    color: {r: number; g: number; b: number} | string | number,
    g?: number,
    b?: number,
  ): void {
    this.#bgRgba = typeof color === 'number' && g !== undefined && b !== undefined
      ? rgbToRgba(color, g, b)
      : rgbToRgba(color as string | number | {r: number; g: number; b: number});
  }

  get visible() {
    return this.#visible;
  }

  setVisible(visible: boolean) {
    this.#visible = visible;
  }

  emitDrawCommands(buf: DrawListBuffer): void {
    buf.setBackground(this.#bgRgba);
    buf.setSynchronizedUpdate(true);
    buf.hideCursor();

    const sorted = [...this.#widgets].toSorted((a, b) => a.zIndex - b.zIndex);
    for (const widget of sorted) {
      widget.emitDrawCommands(buf);
    }
  }

  clearWidgets() {
    for (const widget of this.#widgets) {
      widget.unmounted();
    }

    this.#widgets.clear();
  }

  destroy() {
    for (const widget of this.#widgets) {
      this.unmount(widget);
    }
  }
}

export default TuiScene;
