import type {DrawListBuffer} from '../../draw-list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {BorderSides} from '../../draw-list/types';
import {
  resolveBorderStyle,
  type TuiBorderStyleName,
  type TuiWidgetRect,
  type TuiWidgetSize,
} from '../types';
import {resolveColorState} from '../color-scheme';
import {ThemedWidget} from '../ThemedWidget';
import type {SwitchWidgetOptions} from './types';

type SwitchColors = {
  fg: number;
  bg: number;
  cross: number;
  check: number;
  dim: number;
  colorBorder: number;
  borderStyle: number;
};

const SWITCH_TOKEN_MAP = {
  colorFgNormal: 'text',
  colorBgNormal: 'surface',
  colorCrossNormal: 'danger',
  colorCheckNormal: 'success',
  colorDimNormal: 'textMuted',
  colorFgHovered: 'text',
  colorBgHovered: 'surfaceHover',
  colorCrossHovered: 'danger',
  colorCheckHovered: 'success',
  colorDimHovered: 'borderFocused',
  colorFgFocused: 'text',
  colorBgFocused: 'surface',
  colorCrossFocused: 'danger',
  colorCheckFocused: 'success',
  colorDimFocused: 'textMuted',
  colorFgDisabled: 'textMuted',
  colorBgDisabled: 'surface',
  colorCrossDisabled: 'border',
  colorCheckDisabled: 'border',
  colorDimDisabled: 'surfaceFocused',
  colorBorderFocused: 'borderFocused',
  borderStyleFocused: 'border.focused',
} as const;

function getDefaultSwitchOptions() {
  return {
    x: 0,
    y: 0,
    width: 12,
    height: 1,
    label: '',
    checked: false,
    disabled: false,
  };
}

export class SwitchWidget extends ThemedWidget<SwitchColors> {
  static override readonly TOKEN_MAP = SWITCH_TOKEN_MAP;

  readonly #rect: TuiWidgetRect;
  #label: string;
  #checked: boolean;

  constructor(options: SwitchWidgetOptions = {}) {
    super(options);
    const resolved = {...getDefaultSwitchOptions(), ...options};
    this.#rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#label = resolved.label;
    this.#checked = resolved.checked;
    this.setDisabled(resolved.disabled);

    this.on('click', () => {
      this.#toggle();
    });
  }

  get checked(): boolean {
    return this.#checked;
  }

  get label(): string {
    return this.#label;
  }

  override get rect(): TuiWidgetRect {
    return this.#rect;
  }

  override intrinsicSize(): TuiWidgetSize | undefined {
    return {width: this.#rect.width, height: this.#rect.height};
  }

  override handleActiveKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      this.#toggle();
    }
  }

  setChecked(isChecked: boolean): void {
    this.#checked = isChecked;
  }

  setLabel(text: string): void {
    this.#label = text;
  }

  updateBorder(options: {borderStyle?: TuiBorderStyleName}): void {
    if (options.borderStyle === undefined) {
      return;
    }

    this.colors.focused!.borderStyle = resolveBorderStyle(options.borderStyle);
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    Object.assign(this.#rect, rect);
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const {x, y, width, height} = this.#rect;
    if (width <= 0 || height <= 0) {
      return;
    }

    buffer.pushClip(x, y, width, height);

    const colors = resolveColorState(this.colors, {
      disabled: this.disabled,
      focused: this.focused,
      hovered: this.hovered,
    });
    const textY = y + Math.floor(height / 2);

    buffer.drawRect({
      x,
      y,
      width,
      height,
      bgRgba: colors.bg,
    });

    buffer.drawText({
      x,
      y: textY,
      text: '✗',
      fgRgba: this.#checked ? colors.dim : colors.bg,
      bgRgba: this.#checked ? 0x00_00_00_00 : colors.cross,
    });

    buffer.drawText({
      x: x + 1,
      y: textY,
      text: '|',
      fgRgba: colors.dim,
      bgRgba: 0x00_00_00_00,
    });

    buffer.drawText({
      x: x + 2,
      y: textY,
      text: '✓',
      fgRgba: this.#checked ? colors.bg : colors.dim,
      bgRgba: this.#checked ? colors.check : 0x00_00_00_00,
    });

    if (this.#label.length > 0) {
      const labelX = x + 4;
      const maxLabelWidth = width - 4;
      if (maxLabelWidth > 0) {
        const visibleLabel = this.#label.slice(0, Math.max(0, maxLabelWidth));
        buffer.drawText({
          x: labelX,
          y: textY,
          text: visibleLabel,
          fgRgba: colors.fg,
          bgRgba: 0x00_00_00_00,
        });
      }
    }

    if (this.focused && !this.disabled && this.colors.focused!.borderStyle !== 0) {
      buffer.drawBorder({
        x,
        y,
        width,
        height,
        colorRgba: this.colors.focused!.colorBorder,
        style: this.colors.focused!.borderStyle,
        sides: BorderSides.All,
      });
    }

    buffer.popClip();
  }

  #toggle(): void {
    this.#checked = !this.#checked;
    this.dispatch('change', {checked: this.#checked});
  }
}

export function createSwitchWidget(options?: Partial<SwitchWidgetOptions>): SwitchWidget {
  return new SwitchWidget(options ?? {});
}

export default SwitchWidget;
