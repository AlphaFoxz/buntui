import {
  type DrawListBuffer, type TuiWidgetRect, TuiWidgetEntity, extractPercentSpec, isPercent,
} from '@buntui/core';
import {buildTrailGradient} from '../../utils/color';
import {MATRIX_CHARSET} from './charset';
import {DEFAULT_MATRIX_COLOR_SCHEME, DEFAULT_MATRIX_OPTIONS} from './defaults';
import {type MatrixColumnState, createColumn, tickColumn} from './matrix-column';
import type {MatrixWidgetOptions} from './types';

export class MatrixWidget extends TuiWidgetEntity {
  readonly #x: number;
  readonly #y: number;
  #width: number;
  #height: number;

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
  #lastTick = 0;
  readonly #tickInterval: number;

  constructor(options: MatrixWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_MATRIX_OPTIONS, ...options};
    const spec = extractPercentSpec(resolved.x, resolved.y, resolved.width, resolved.height);
    if (spec) {
      this.setPercentSpec(spec);
    }

    this.#x = isPercent(resolved.x) ? 0 : (typeof resolved.x === 'number' ? resolved.x : 0);
    this.#y = isPercent(resolved.y) ? 0 : (typeof resolved.y === 'number' ? resolved.y : 0);
    this.#width = isPercent(resolved.width) ? 0 : (typeof resolved.width === 'number' ? resolved.width : 0);
    this.#height = isPercent(resolved.height) ? 0 : (typeof resolved.height === 'number' ? resolved.height : 0);

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
    this.#tickInterval = 16;

    this.#rebuildGradient();
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    if (rect.width !== undefined) {
      this.#width = rect.width;
    }

    if (rect.height !== undefined) {
      this.#height = rect.height;
    }
  }

  override containsPoint(x: number, y: number): boolean {
    return x >= this.#x
      && x < this.#x + this.#width
      && y >= this.#y
      && y < this.#y + this.#height;
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const w = this.#width;
    const h = this.#height;
    if (w <= 0 || h <= 0) {
      return;
    }

    this.#ensureColumns(w, h);

    const now = Date.now();
    const shouldTick = now - this.#lastTick >= this.#tickInterval;
    if (shouldTick) {
      this.#lastTick = now;
    }

    const absX = this.#x;
    const absY = this.#y;
    const charset = this.#charset;
    const maxLength = this.#maxTrailLength;

    buffer.pushClip(absX, absY, w, h);

    for (let col = 0; col < this.#columns.length; col++) {
      const column = this.#columns[col]!;
      if (shouldTick) {
        tickColumn(column, h, this.#speedRange, this.#minTrailLength, this.#maxTrailLength, this.#density, charset);
      }

      if (!column.active) {
        continue;
      }

      const cx = absX + col;
      const {headY} = column;
      const {trailLength} = column;
      const chars = column.chars;

      for (let t = 0; t < trailLength; t++) {
        const cy = absY + headY - t;
        if (cy < absY || cy >= absY + h) {
          continue;
        }

        const isLead = t === 0;
        const fgRgba = isLead
          ? this.#colorScheme.leadRgba
          : (this.#gradientLut[Math.min(t, maxLength - 1)] ?? this.#colorScheme.trailRgba);

        buffer.drawChar({
          x: cx,
          y: cy,
          char: chars[t] ?? charset[0]!,
          fgRgba,
          bgRgba: this.#colorScheme.bgRgba,
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
      this.#columns.push(createColumn(height, this.#speedRange, this.#minTrailLength, this.#maxTrailLength, this.#charset));
    }

    this.#initialized = true;
  }
}

export function createMatrixWidget(options?: MatrixWidgetOptions): MatrixWidget {
  return new MatrixWidget(options);
}

export default MatrixWidget;
