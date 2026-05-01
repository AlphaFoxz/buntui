import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {Focusable} from '../Focusable';
import type {SwitchWidgetOptions} from './types';

const DEFAULT_SWITCH_OPTIONS: Required<SwitchWidgetOptions> = {
  rectX: 0,
  rectY: 0,
  rectWidth: 12,
  rectHeight: 1,
  label: '',
  checked: false,
  disabled: false,

  colorFgNormal: 0xFF_FF_FF_FF,
  colorBgNormal: 0x1E_1E_2E_FF,
  colorCrossNormal: 0xF3_8B_A8_FF,
  colorCheckNormal: 0xA6_E3_A1_FF,
  colorDimNormal: 0x6C_70_86_FF,

  colorFgHovered: 0xFF_FF_FF_FF,
  colorBgHovered: 0x45_47_5A_FF,
  colorCrossHovered: 0xF3_8B_A8_FF,
  colorCheckHovered: 0xA6_E3_A1_FF,
  colorDimHovered: 0x89_B4_FA_FF,

  colorFgFocused: 0xFF_FF_FF_FF,
  colorBgFocused: 0x1E_1E_2E_FF,
  colorCrossFocused: 0xF3_8B_A8_FF,
  colorCheckFocused: 0xA6_E3_A1_FF,
  colorDimFocused: 0x6C_70_86_FF,

  colorFgDisabled: 0x6C_70_86_FF,
  colorBgDisabled: 0x1E_1E_2E_FF,
  colorCrossDisabled: 0x45_47_5A_FF,
  colorCheckDisabled: 0x45_47_5A_FF,
  colorDimDisabled: 0x31_32_44_FF,
};

type SwitchColors = {
  fg: number;
  bg: number;
  cross: number;
  check: number;
  dim: number;
};

export class SwitchWidget extends TuiWidgetEntity implements Focusable {
  #rectX: number;
  #rectY: number;
  #rectWidth: number;
  #rectHeight: number;
  #label: string;
  #checked: boolean;
  #focused = false;
  #hovered = false;
  #disabled: boolean;

  readonly #colorFgNormal: number;
  readonly #colorBgNormal: number;
  readonly #colorCrossNormal: number;
  readonly #colorCheckNormal: number;
  readonly #colorDimNormal: number;
  readonly #colorFgHovered: number;
  readonly #colorBgHovered: number;
  readonly #colorCrossHovered: number;
  readonly #colorCheckHovered: number;
  readonly #colorDimHovered: number;
  readonly #colorFgFocused: number;
  readonly #colorBgFocused: number;
  readonly #colorCrossFocused: number;
  readonly #colorCheckFocused: number;
  readonly #colorDimFocused: number;
  readonly #colorFgDisabled: number;
  readonly #colorBgDisabled: number;
  readonly #colorCrossDisabled: number;
  readonly #colorCheckDisabled: number;
  readonly #colorDimDisabled: number;

  constructor(options: SwitchWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_SWITCH_OPTIONS, ...options};

    this.#rectX = resolved.rectX;
    this.#rectY = resolved.rectY;
    this.#rectWidth = resolved.rectWidth;
    this.#rectHeight = resolved.rectHeight;
    this.#label = resolved.label;
    this.#checked = resolved.checked;
    this.#disabled = resolved.disabled;

    this.#colorFgNormal = resolved.colorFgNormal;
    this.#colorBgNormal = resolved.colorBgNormal;
    this.#colorCrossNormal = resolved.colorCrossNormal;
    this.#colorCheckNormal = resolved.colorCheckNormal;
    this.#colorDimNormal = resolved.colorDimNormal;
    this.#colorFgHovered = resolved.colorFgHovered;
    this.#colorBgHovered = resolved.colorBgHovered;
    this.#colorCrossHovered = resolved.colorCrossHovered;
    this.#colorCheckHovered = resolved.colorCheckHovered;
    this.#colorDimHovered = resolved.colorDimHovered;
    this.#colorFgFocused = resolved.colorFgFocused;
    this.#colorBgFocused = resolved.colorBgFocused;
    this.#colorCrossFocused = resolved.colorCrossFocused;
    this.#colorCheckFocused = resolved.colorCheckFocused;
    this.#colorDimFocused = resolved.colorDimFocused;
    this.#colorFgDisabled = resolved.colorFgDisabled;
    this.#colorBgDisabled = resolved.colorBgDisabled;
    this.#colorCrossDisabled = resolved.colorCrossDisabled;
    this.#colorCheckDisabled = resolved.colorCheckDisabled;
    this.#colorDimDisabled = resolved.colorDimDisabled;

    this.on('click', () => {
      if (this.#disabled) {
        return;
      }

      this.#toggle();
    });

    this.on('mouseover', () => {
      if (this.#disabled) {
        return;
      }

      this.#hovered = true;
    });

    this.on('mouseout', () => {
      this.#hovered = false;
    });
  }

  get acceptsFocus(): boolean {
    return !this.#disabled;
  }

  get checked(): boolean {
    return this.#checked;
  }

  get label(): string {
    return this.#label;
  }

  get disabled(): boolean {
    return this.#disabled;
  }

  override get rect(): TuiWidgetRect {
    return {
      rectX: this.#rectX,
      rectY: this.#rectY,
      rectWidth: this.#rectWidth,
      rectHeight: this.#rectHeight,
    };
  }

  focus(): void {
    this.#focused = true;
    this.dispatch('focus', undefined);
  }

  blur(): void {
    this.#focused = false;
    this.dispatch('blur', undefined);
  }

  handleKey(event: KeyboardEvent): void {
    if (this.#disabled) {
      return;
    }

    if (event.key === undefined) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      this.#toggle();
    }
  }

  setChecked(value: boolean): void {
    this.#checked = value;
  }

  setLabel(text: string): void {
    this.#label = text;
  }

  updateText(text: string): void {
    this.#label = text;
  }

  setDisabled(value: boolean): void {
    this.#disabled = value;
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    if (rect.rectX !== undefined) {
      this.#rectX = rect.rectX;
    }

    if (rect.rectY !== undefined) {
      this.#rectY = rect.rectY;
    }

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
    if (this.#rectWidth <= 0 || this.#rectHeight <= 0) {
      return;
    }

    buffer.pushClip(this.#rectX, this.#rectY, this.#rectWidth, this.#rectHeight);

    const colors = this.#resolveColors();
    const textY = this.#rectY + Math.floor(this.#rectHeight / 2);

    // Background
    buffer.drawRect({
      x: this.#rectX,
      y: this.#rectY,
      width: this.#rectWidth,
      height: this.#rectHeight,
      bgRgba: colors.bg,
    });

    // ✗ — red bg when off (active), dim when on
    buffer.drawText({
      x: this.#rectX,
      y: textY,
      text: '✗',
      fgRgba: this.#checked ? colors.dim : colors.bg,
      bgRgba: this.#checked ? 0x00_00_00_00 : colors.cross,
    });

    // | — always dim
    buffer.drawText({
      x: this.#rectX + 1,
      y: textY,
      text: '|',
      fgRgba: colors.dim,
      bgRgba: 0x00_00_00_00,
    });

    // ✓ — dim when off, green bg when on (active)
    buffer.drawText({
      x: this.#rectX + 2,
      y: textY,
      text: '✓',
      fgRgba: this.#checked ? colors.bg : colors.dim,
      bgRgba: this.#checked ? colors.check : 0x00_00_00_00,
    });

    // Label
    if (this.#label.length > 0) {
      const labelX = this.#rectX + 4;
      const maxLabelWidth = this.#rectWidth - 4;
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

    buffer.popClip();
  }

  override unmounted(): void {
    if (this.#focused) {
      this.blur();
    }

    super.unmounted();
  }

  #toggle(): void {
    this.#checked = !this.#checked;
    this.dispatch('change', {checked: this.#checked});
  }

  #resolveColors(): SwitchColors {
    if (this.#disabled) {
      return {
        fg: this.#colorFgDisabled,
        bg: this.#colorBgDisabled,
        cross: this.#colorCrossDisabled,
        check: this.#colorCheckDisabled,
        dim: this.#colorDimDisabled,
      };
    }

    if (this.#hovered) {
      return {
        fg: this.#colorFgHovered,
        bg: this.#colorBgHovered,
        cross: this.#colorCrossHovered,
        check: this.#colorCheckHovered,
        dim: this.#colorDimHovered,
      };
    }

    if (this.#focused) {
      return {
        fg: this.#colorFgFocused,
        bg: this.#colorBgFocused,
        cross: this.#colorCrossFocused,
        check: this.#colorCheckFocused,
        dim: this.#colorDimFocused,
      };
    }

    return {
      fg: this.#colorFgNormal,
      bg: this.#colorBgNormal,
      cross: this.#colorCrossNormal,
      check: this.#colorCheckNormal,
      dim: this.#colorDimNormal,
    };
  }
}

export function createSwitchWidget(options?: Partial<SwitchWidgetOptions>): SwitchWidget {
  return new SwitchWidget({...DEFAULT_SWITCH_OPTIONS, ...options});
}

export default SwitchWidget;
