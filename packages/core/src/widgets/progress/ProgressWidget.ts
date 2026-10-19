import type {DrawListBuffer} from '../../draw-list/DrawListBuffer';
import type {KeyboardEvent} from '../../events/types';
import {type TuiSizeValue, type TuiWidgetRect, type TuiWidgetSize} from '../types';
import {resolveColorState} from '../color-scheme';
import {ThemedWidget} from '../ThemedWidget';
import type {ProgressWidgetOptions} from './types';

type ProgressColors = {
  track: number;
  fill: number;
};

const PROGRESS_TOKEN_MAP = {
  colorTrackNormal: 'progressTrack',
  colorFillNormal: 'progressFill',
  colorTrackDisabled: 'surface',
  colorFillDisabled: 'border',
} as const;

function getDefaultProgressOptions() {
  return {
    x: 0 as TuiSizeValue,
    y: 0 as TuiSizeValue,
    width: 30 as TuiSizeValue,
    height: 1 as TuiSizeValue,
    value: undefined as number | undefined,
    max: 1,
    disabled: false,
  };
}

export class ProgressWidget extends ThemedWidget<ProgressColors> {
  static override readonly TOKEN_MAP = PROGRESS_TOKEN_MAP;

  static readonly #ANIM_SPEED = 0.4;

  readonly #rect: TuiWidgetRect;
  #value: number | undefined;
  #max: number;
  #animOffset = 0;
  #animDirection = 1;

  constructor(options: ProgressWidgetOptions = {}) {
    super(options);
    const resolved = {...getDefaultProgressOptions(), ...options};
    this.#rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#max = resolved.max;
    this.#value = resolved.value === undefined ? undefined : this.#clamp(resolved.value);
    this.setDisabled(resolved.disabled);
  }

  override get acceptsFocus(): boolean {
    return false;
  }

  get value(): number | undefined {
    return this.#value;
  }

  get max(): number {
    return this.#max;
  }

  get indeterminate(): boolean {
    return this.#value === undefined;
  }

  override get rect(): TuiWidgetRect {
    return this.#rect;
  }

  override intrinsicSize(): TuiWidgetSize | undefined {
    return {width: this.#rect.width, height: this.#rect.height};
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    Object.assign(this.#rect, rect);
  }

  updateValue(value: number | undefined): void {
    if (value === undefined) {
      this.#value = undefined;
      this.#animOffset = 0;
      this.#animDirection = 1;
    } else {
      this.#value = this.#clamp(value);
    }
  }

  setMax(max: number): void {
    this.#max = max;
    if (this.#value !== undefined) {
      this.#value = this.#clamp(this.#value);
    }
  }

  override update(dt: number): void {
    if (this.#value !== undefined || this.disabled) {
      return;
    }

    this.#animOffset += this.#animDirection * ProgressWidget.#ANIM_SPEED * dt / 1000;
    if (this.#animOffset >= 1) {
      this.#animOffset = 1;
      this.#animDirection = -1;
    } else if (this.#animOffset <= 0) {
      this.#animOffset = 0;
      this.#animDirection = 1;
    }
  }

  override handleActiveKey(_event: KeyboardEvent): void {
    // No-op
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const {x, y, width, height} = this.#rect;
    if (width <= 0 || height <= 0) {
      return;
    }

    buffer.pushClip(x, y, width, height);

    const colors = resolveColorState(this.colors, {disabled: this.disabled});
    const trackColor = colors.track;
    const fillColor = colors.fill;

    buffer.drawRect({
      x, y, width, height, bgRgba: trackColor,
    });

    if (this.#value === undefined) {
      const fillWidth = Math.max(1, Math.round(width * 0.3));
      const travelRange = width - fillWidth;
      const fillX = x + Math.round(this.#animOffset * travelRange);
      buffer.drawRect({
        x: fillX, y, width: fillWidth, height, bgRgba: fillColor,
      });
    } else {
      const ratio = this.#getRatio();
      const fillWidth = Math.round(ratio * width);
      if (fillWidth > 0) {
        buffer.drawRect({
          x, y, width: fillWidth, height, bgRgba: fillColor,
        });
      }
    }

    buffer.popClip();
  }

  #clamp(value: number): number {
    return Math.min(this.#max, Math.max(0, value));
  }

  #getRatio(): number {
    return this.#value === undefined || this.#max === 0 ? 0 : Math.max(0, Math.min(1, this.#value / this.#max));
  }
}

export function createProgressWidget(options?: Partial<ProgressWidgetOptions>): ProgressWidget {
  return new ProgressWidget(options ?? {});
}

export default ProgressWidget;
