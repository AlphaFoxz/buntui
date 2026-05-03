import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {Focusable} from '../Focusable';
import {parseColor} from '../../utils/color';
import type {SwitchWidgetOptions} from './types';

const DEFAULT_SWITCH_OPTIONS: Required<SwitchWidgetOptions> = {
  x: 0,
  y: 0,
  width: 12,
  height: 1,
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
  #x: number;
  #y: number;
  #width: number;
  #height: number;
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

    this.#x = resolved.x;
    this.#y = resolved.y;
    this.#width = resolved.width;
    this.#height = resolved.height;
    this.#label = resolved.label;
    this.#checked = resolved.checked;
    this.#disabled = resolved.disabled;

    this.#colorFgNormal = parseColor(resolved.colorFgNormal);
    this.#colorBgNormal = parseColor(resolved.colorBgNormal);
    this.#colorCrossNormal = parseColor(resolved.colorCrossNormal);
    this.#colorCheckNormal = parseColor(resolved.colorCheckNormal);
    this.#colorDimNormal = parseColor(resolved.colorDimNormal);
    this.#colorFgHovered = parseColor(resolved.colorFgHovered);
    this.#colorBgHovered = parseColor(resolved.colorBgHovered);
    this.#colorCrossHovered = parseColor(resolved.colorCrossHovered);
    this.#colorCheckHovered = parseColor(resolved.colorCheckHovered);
    this.#colorDimHovered = parseColor(resolved.colorDimHovered);
    this.#colorFgFocused = parseColor(resolved.colorFgFocused);
    this.#colorBgFocused = parseColor(resolved.colorBgFocused);
    this.#colorCrossFocused = parseColor(resolved.colorCrossFocused);
    this.#colorCheckFocused = parseColor(resolved.colorCheckFocused);
    this.#colorDimFocused = parseColor(resolved.colorDimFocused);
    this.#colorFgDisabled = parseColor(resolved.colorFgDisabled);
    this.#colorBgDisabled = parseColor(resolved.colorBgDisabled);
    this.#colorCrossDisabled = parseColor(resolved.colorCrossDisabled);
    this.#colorCheckDisabled = parseColor(resolved.colorCheckDisabled);
    this.#colorDimDisabled = parseColor(resolved.colorDimDisabled);

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
      x: this.#x,
      y: this.#y,
      width: this.#width,
      height: this.#height,
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
  }

  override containsPoint(x: number, y: number): boolean {
    return x >= this.#x
      && x < this.#x + this.#width
      && y >= this.#y
      && y < this.#y + this.#height;
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    if (this.#width <= 0 || this.#height <= 0) {
      return;
    }

    buffer.pushClip(this.#x, this.#y, this.#width, this.#height);

    const colors = this.#resolveColors();
    const textY = this.#y + Math.floor(this.#height / 2);

    // Background
    buffer.drawRect({
      x: this.#x,
      y: this.#y,
      width: this.#width,
      height: this.#height,
      bgRgba: colors.bg,
    });

    // ✗ — red bg when off (active), dim when on
    buffer.drawText({
      x: this.#x,
      y: textY,
      text: '✗',
      fgRgba: this.#checked ? colors.dim : colors.bg,
      bgRgba: this.#checked ? 0x00_00_00_00 : colors.cross,
    });

    // | — always dim
    buffer.drawText({
      x: this.#x + 1,
      y: textY,
      text: '|',
      fgRgba: colors.dim,
      bgRgba: 0x00_00_00_00,
    });

    // ✓ — dim when off, green bg when on (active)
    buffer.drawText({
      x: this.#x + 2,
      y: textY,
      text: '✓',
      fgRgba: this.#checked ? colors.bg : colors.dim,
      bgRgba: this.#checked ? colors.check : 0x00_00_00_00,
    });

    // Label
    if (this.#label.length > 0) {
      const labelX = this.#x + 4;
      const maxLabelWidth = this.#width - 4;
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
