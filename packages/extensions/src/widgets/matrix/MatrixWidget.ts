import {type DrawListBuffer, type TuiWidgetRect, TuiWidgetEntity} from '@buntui/core';
import {buildTrailGradient} from '../../utils/color';
import {MATRIX_CHARSET} from './charset';
import {DEFAULT_MATRIX_COLOR_SCHEME, DEFAULT_MATRIX_OPTIONS} from './defaults';
import {type MatrixColumnState, createColumn, tickColumn} from './matrix-column';
import type {MatrixWidgetOptions} from './types';

export class MatrixWidget extends TuiWidgetEntity {
  readonly #rectX: number;
  readonly #rectY: number;
  #rectWidth: number;
  #rectHeight: number;

  readonly #colorScheme: {
    leadRgba: number;
    trailRgba: number;
    bgRgba: number;
  };

  readonly #speedRange: {max: number; min: number};
  readonly #minTrailLength: number;
  readonly #maxTrailLength: number;
  readonly #density: number;
  readonly #charset: number[];

  #columns: MatrixColumnState[] = [];
  #gradientLut: number[] = [];
  #initialized = false;

  constructor(options: MatrixWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_MATRIX_OPTIONS, ...options};
    this.#rectX = resolved.rectX ?? 0;
    this.#rectY = resolved.rectY ?? 0;
    this.#rectWidth = resolved.rectWidth ?? 0;
    this.#rectHeight = resolved.rectHeight ?? 0;

    const schemeOverride = resolved.colorScheme ?? {};
    this.#colorScheme = {
      leadRgba: schemeOverride.leadRgba ?? DEFAULT_MATRIX_COLOR_SCHEME.leadRgba,
      trailRgba: schemeOverride.trailRgba ?? DEFAULT_MATRIX_COLOR_SCHEME.trailRgba,
      bgRgba: schemeOverride.bgRgba ?? DEFAULT_MATRIX_COLOR_SCHEME.bgRgba,
    };
    this.#speedRange = resolved.speedRange ?? {min: 1, max: 3};
    this.#minTrailLength = resolved.minTrailLength ?? 5;
    this.#maxTrailLength = resolved.maxTrailLength ?? 20;
    this.#density = resolved.density ?? 0.8;
    this.#charset = resolved.charset ?? MATRIX_CHARSET;

    this.#rebuildGradient();
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    if (rect.rectWidth !== undefined) {
      this.#rectWidth = rect.rectWidth;
    }

    if (rect.rectHeight !== undefined) {
      this.#rectHeight = rect.rectHeight;
    }
  }

  override containsPoint(x: number, y: number): boolean {
    return x >= this.#rectX
      && x < this.#rectX + this.#rectWidth
      && y >= this.#rectY
      && y < this.#rectY + this.#rectHeight;
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const w = this.#rectWidth;
    const h = this.#rectHeight;
    if (w <= 0 || h <= 0) {
      return;
    }

    this.#ensureColumns(w, h);

    const absX = this.#rectX;
    const absY = this.#rectY;
    const charset = this.#charset;
    const maxLength = this.#maxTrailLength;

    buffer.pushClip(absX, absY, w, h);

    for (let col = 0; col < this.#columns.length; col++) {
      const column = this.#columns[col]!;
      tickColumn(column, h, this.#speedRange, this.#minTrailLength, this.#maxTrailLength, this.#density);

      if (!column.active) {
        continue;
      }

      const cx = absX + col;
      const {headY} = column;
      const {trailLength} = column;

      for (let t = 0; t < trailLength; t++) {
        const cy = absY + headY - t;
        if (cy < absY || cy >= absY + h) {
          continue;
        }

        const isLead = t === 0;
        const fgRgba = isLead
          ? this.#colorScheme.leadRgba
          : (this.#gradientLut[Math.min(t, maxLength - 1)] ?? this.#colorScheme.trailRgba);

        const charCode = charset[Math.floor(Math.random() * charset.length)]!;

        buffer.drawChar({
          x: cx,
          y: cy,
          char: charCode,
          fgRgba,
          bgRgba: this.#colorScheme.bgRgba,
        });
      }
    }

    buffer.popClip();
  }

  override get rect(): TuiWidgetRect {
    return {
      rectX: this.#rectX,
      rectY: this.#rectY,
      rectWidth: this.#rectWidth,
      rectHeight: this.#rectHeight,
    };
  }

  #rebuildGradient(): void {
    this.#gradientLut = buildTrailGradient(
      this.#colorScheme.leadRgba,
      this.#colorScheme.trailRgba,
      this.#maxTrailLength,
    );
  }

  #ensureColumns(width: number, height: number): void {
    if (this.#columns.length === width && this.#initialized) {
      return;
    }

    this.#columns = [];
    for (let x = 0; x < width; x++) {
      this.#columns.push(createColumn(height, this.#speedRange, this.#minTrailLength, this.#maxTrailLength));
    }

    this.#initialized = true;
  }
}

export function createMatrixWidget(options?: MatrixWidgetOptions): MatrixWidget {
  return new MatrixWidget(options);
}

export default MatrixWidget;
