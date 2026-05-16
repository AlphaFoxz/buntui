import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {type ColorScheme, resolveColorState} from '../color-scheme';
import {getTheme} from '../../theme/provider';
import {extractPercentSpec, isPercent} from '../../utils/percent';
import type {ProgressBarWidgetOptions} from './types';

type ProgressBarColors = {
  track: number;
  fill: number;
  text: number;
};

function getDefaultProgressBarOptions(): Required<ProgressBarWidgetOptions> {
  const theme = getTheme();
  return {
    x: 0,
    y: 0,
    width: 30,
    height: 1,
    value: 0,
    min: 0,
    max: 100,
    label: '',
    showPercentage: true,
    disabled: false,

    colorTrackNormal: theme.colors.progressTrack,
    colorFillNormal: theme.colors.progressFill,
    colorTextNormal: theme.colors.text,

    colorTrackFocused: theme.colors.surfaceHover,
    colorFillFocused: theme.colors.accentHover,
    colorTextFocused: theme.colors.text,

    colorTrackDisabled: theme.colors.surface,
    colorFillDisabled: theme.colors.border,
    colorTextDisabled: theme.colors.textMuted,
  };
}

export class ProgressBarWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #value: number;
  #min: number;
  #max: number;
  #label: string;
  #showPercentage: boolean;

  readonly #colors: ColorScheme<ProgressBarColors>;

  constructor(options: ProgressBarWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultProgressBarOptions(), ...options};
    const spec = extractPercentSpec(resolved.x, resolved.y, resolved.width, resolved.height);
    if (spec) {
      this.setPercentSpec(spec);
    }

    this.#rect = {
      x: isPercent(resolved.x) ? 0 : resolved.x,
      y: isPercent(resolved.y) ? 0 : resolved.y,
      width: isPercent(resolved.width) ? 0 : resolved.width,
      height: isPercent(resolved.height) ? 0 : resolved.height,
    };
    this.#min = resolved.min;
    this.#max = resolved.max;
    this.#value = this.#clamp(resolved.value);
    this.#label = resolved.label;
    this.#showPercentage = resolved.showPercentage;
    this.setDisabled(resolved.disabled);

    this.#colors = {
      normal: {
        track: parseColor(resolved.colorTrackNormal),
        fill: parseColor(resolved.colorFillNormal),
        text: parseColor(resolved.colorTextNormal),
      },
      focused: {
        track: parseColor(resolved.colorTrackFocused),
        fill: parseColor(resolved.colorFillFocused),
        text: parseColor(resolved.colorTextFocused),
      },
      disabled: {
        track: parseColor(resolved.colorTrackDisabled),
        fill: parseColor(resolved.colorFillDisabled),
        text: parseColor(resolved.colorTextDisabled),
      },
    };
  }

  get value(): number {
    return this.#value;
  }

  get min(): number {
    return this.#min;
  }

  get max(): number {
    return this.#max;
  }

  get label(): string {
    return this.#label;
  }

  get showPercentage(): boolean {
    return this.#showPercentage;
  }

  override get rect(): TuiWidgetRect {
    return this.#rect;
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    Object.assign(this.#rect, rect);
  }

  updateValue(value: number): void {
    this.#value = this.#clamp(value);
  }

  setRange(min: number, max: number): void {
    this.#min = min;
    this.#max = max;
    this.#value = this.#clamp(this.#value);
  }

  setLabel(text: string): void {
    this.#label = text;
  }

  updateShowPercentage(value: boolean): void {
    this.#showPercentage = value;
  }

  handleKey(event: KeyboardEvent): void {
    this.dispatchKeyEvent(event);
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const {x, y, width, height} = this.#rect;
    if (width <= 0 || height <= 0) {
      return;
    }

    buffer.pushClip(x, y, width, height);

    const colors = resolveColorState(this.#colors, {
      disabled: this.disabled,
      focused: this.focused,
    });

    const textY = y + Math.floor(height / 2);

    let barX = x;
    let barWidth = width;

    if (this.#label.length > 0) {
      const maxLabelWidth = width - 4;
      if (maxLabelWidth > 0) {
        const visibleLabel = this.#label.slice(0, Math.max(0, maxLabelWidth));
        buffer.drawText({
          x,
          y: textY,
          text: visibleLabel,
          fgRgba: colors.text,
          bgRgba: 0x00_00_00_00,
        });
        barX = x + visibleLabel.length + 1;
        barWidth = width - visibleLabel.length - 1;
      }
    }

    if (barWidth > 0) {
      buffer.drawRect({
        x: barX,
        y,
        width: barWidth,
        height,
        bgRgba: colors.track,
      });

      const ratio = this.#getRatio();
      const fillWidth = Math.round(ratio * barWidth);
      if (fillWidth > 0) {
        buffer.drawRect({
          x: barX,
          y,
          width: fillWidth,
          height,
          bgRgba: colors.fill,
        });
      }

      if (this.#showPercentage && barWidth >= 4) {
        const percentageText = `${Math.round(ratio * 100)}%`;
        const textX = barX + Math.floor((barWidth - percentageText.length) / 2);
        buffer.drawText({
          x: textX,
          y: textY,
          text: percentageText,
          fgRgba: colors.text,
          bgRgba: 0x00_00_00_00,
        });
      }
    }

    buffer.popClip();
  }

  #clamp(value: number): number {
    return Math.min(this.#max, Math.max(this.#min, value));
  }

  #getRatio(): number {
    const range = this.#max - this.#min;
    if (range === 0) {
      return this.#value >= this.#max ? 1 : 0;
    }

    return Math.max(0, Math.min(1, (this.#value - this.#min) / range));
  }
}

export function createProgressBarWidget(options?: Partial<ProgressBarWidgetOptions>): ProgressBarWidget {
  return new ProgressBarWidget({...getDefaultProgressBarOptions(), ...options});
}

export default ProgressBarWidget;
