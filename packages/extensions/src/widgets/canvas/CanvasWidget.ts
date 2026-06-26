import {
  type DrawListBuffer,
  type TuiWidgetRect,
  type TuiWidgetSize,
  TuiWidgetEntity,
} from '@buntui/core';
import type {CanvasCell, CanvasWidgetOptions} from './types';

export class CanvasWidget extends TuiWidgetEntity {
  #x: number;
  #y: number;
  #width: number;
  #height: number;

  #chars: Uint32Array;
  #fgRgba: Uint32Array;
  #bgRgba: Uint32Array;

  constructor(options: CanvasWidgetOptions = {}) {
    super();
    const rect = this.initRect(options.x, options.y, options.width, options.height);
    this.#x = rect.x;
    this.#y = rect.y;
    this.#width = rect.width;
    this.#height = rect.height;

    const size = Math.max(0, this.#width * this.#height);
    this.#chars = new Uint32Array(size);
    this.#fgRgba = new Uint32Array(size);
    this.#bgRgba = new Uint32Array(size);

    if (options.cells) {
      this.setCells(options.cells);
    }
  }

  setCell(x: number, y: number, char: number, fgRgba: number, bgRgba = 0): void {
    if (x < 0 || x >= this.#width || y < 0 || y >= this.#height) {
      return;
    }

    const idx = (y * this.#width) + x;
    this.#chars[idx] = char;
    this.#fgRgba[idx] = fgRgba;
    this.#bgRgba[idx] = bgRgba;
  }

  getCell(x: number, y: number): CanvasCell | undefined {
    if (x < 0 || x >= this.#width || y < 0 || y >= this.#height) {
      return undefined;
    }

    const idx = (y * this.#width) + x;
    if (this.#chars[idx] === 0) {
      return undefined;
    }

    return {
      char: this.#chars[idx]!,
      fgRgba: this.#fgRgba[idx]!,
      bgRgba: this.#bgRgba[idx]!,
    };
  }

  clear(): void {
    this.#chars.fill(0);
    this.#fgRgba.fill(0);
    this.#bgRgba.fill(0);
  }

  fill(char: number, fgRgba: number, bgRgba = 0): void {
    this.#chars.fill(char);
    this.#fgRgba.fill(fgRgba);
    this.#bgRgba.fill(bgRgba);
  }

  setCells(cells: readonly CanvasCell[]): void {
    this.clear();
    const count = Math.min(cells.length, this.#chars.length);
    for (let i = 0; i < count; i++) {
      const cell = cells[i]!;
      this.#chars[i] = cell.char;
      this.#fgRgba[i] = cell.fgRgba;
      this.#bgRgba[i] = cell.bgRgba;
    }
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    if (rect.x !== undefined) {
      this.#x = rect.x;
    }

    if (rect.y !== undefined) {
      this.#y = rect.y;
    }

    if (rect.width !== undefined) {
      this.#width = rect.width;
    }

    if (rect.height !== undefined) {
      this.#height = rect.height;
    }

    this.#ensureCapacity();
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const w = this.#width;
    const h = this.#height;
    if (w <= 0 || h <= 0) {
      return;
    }

    const absX = this.#x;
    const absY = this.#y;

    buffer.pushClip(absX, absY, w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w) + x;
        const char = this.#chars[idx]!;
        if (char === 0) {
          continue;
        }

        buffer.drawChar({
          x: absX + x,
          y: absY + y,
          char,
          fgRgba: this.#fgRgba[idx]!,
          bgRgba: this.#bgRgba[idx]!,
        });
      }
    }

    buffer.popClip();
  }

  override get rect(): TuiWidgetRect {
    return {
      x: this.#x,
      y: this.#y,
      width: this.#width,
      height: this.#height,
    };
  }

  override get hasExplicitWidth(): boolean {
    return true;
  }

  override intrinsicSize(): TuiWidgetSize | undefined {
    return {width: this.#width, height: this.#height};
  }

  override containsPoint(x: number, y: number): boolean {
    return x >= this.#x
      && x < this.#x + this.#width
      && y >= this.#y
      && y < this.#y + this.#height;
  }

  #ensureCapacity(): void {
    const needed = Math.max(0, this.#width * this.#height);
    if (this.#chars.length === needed) {
      return;
    }

    this.#chars = new Uint32Array(needed);
    this.#fgRgba = new Uint32Array(needed);
    this.#bgRgba = new Uint32Array(needed);
  }
}

export function createCanvasWidget(options?: CanvasWidgetOptions): CanvasWidget {
  return new CanvasWidget(options);
}

export default CanvasWidget;
