import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect, TuiWidgetSize} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {resolveWidgetColors} from '../../theme/resolve';
import type {ProgressWidgetOptions} from './types';

function getDefaultProgressOptions() {
  return {
    x: 0 as number | `${number}%`,
    y: 0 as number | `${number}%`,
    width: 30 as number | `${number}%`,
    height: 1 as number | `${number}%`,
    value: undefined as number | undefined,
    max: 1,
    disabled: false,
    ...resolveWidgetColors({
      colorTrackNormal: 'progressTrack',
      colorFillNormal: 'progressFill',
      colorTrackDisabled: 'surface',
      colorFillDisabled: 'border',
    }),
  };
}

export class ProgressWidget extends InteractiveWidget {
  static readonly #ANIM_SPEED = 0.4;

  readonly #rect: TuiWidgetRect;
  #value: number | undefined;
  #max: number;
  #animOffset = 0;
  #animDirection = 1;
  #lastTimestamp = 0;

  readonly #colorTrackNormal: number;
  readonly #colorFillNormal: number;
  readonly #colorTrackDisabled: number;
  readonly #colorFillDisabled: number;

  constructor(options: ProgressWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultProgressOptions(), ...options};
    this.#rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#max = resolved.max;
    this.#value = resolved.value === undefined ? undefined : this.#clamp(resolved.value);
    this.setDisabled(resolved.disabled);

    this.#colorTrackNormal = parseColor(resolved.colorTrackNormal);
    this.#colorFillNormal = parseColor(resolved.colorFillNormal);
    this.#colorTrackDisabled = parseColor(resolved.colorTrackDisabled);
    this.#colorFillDisabled = parseColor(resolved.colorFillDisabled);
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
      this.#lastTimestamp = 0;
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

  override update(_dt: number): void {
    if (this.#value !== undefined || this.disabled) {
      return;
    }

    const now = Date.now();
    const delta = this.#lastTimestamp === 0 ? 0 : (now - this.#lastTimestamp);
    this.#lastTimestamp = now;

    this.#animOffset += this.#animDirection * ProgressWidget.#ANIM_SPEED * delta / 1000;
    if (this.#animOffset >= 1) {
      this.#animOffset = 1;
      this.#animDirection = -1;
    } else if (this.#animOffset <= 0) {
      this.#animOffset = 0;
      this.#animDirection = 1;
    }
  }

  override handleActiveKey(_event: KeyboardEvent): void {
    void _event;
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const {x, y, width, height} = this.#rect;
    if (width <= 0 || height <= 0) {
      return;
    }

    buffer.pushClip(x, y, width, height);

    const trackColor = this.disabled ? this.#colorTrackDisabled : this.#colorTrackNormal;
    const fillColor = this.disabled ? this.#colorFillDisabled : this.#colorFillNormal;

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
    if (this.#value === undefined || this.#max === 0) {
      return 0;
    }

    return Math.max(0, Math.min(1, this.#value / this.#max));
  }
}

export function createProgressWidget(options?: Partial<ProgressWidgetOptions>): ProgressWidget {
  return new ProgressWidget({...getDefaultProgressOptions(), ...options});
}

export default ProgressWidget;
