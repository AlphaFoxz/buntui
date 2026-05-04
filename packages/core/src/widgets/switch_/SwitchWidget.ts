import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {type ColorScheme, resolveColorState} from '../color-scheme';
import type {SwitchWidgetOptions} from './types';

type SwitchColors = {
  fg: number;
  bg: number;
  cross: number;
  check: number;
  dim: number;
};

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

export class SwitchWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #label: string;
  #checked: boolean;
  #hovered = false;

  readonly #colors: ColorScheme<SwitchColors>;

  constructor(options: SwitchWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_SWITCH_OPTIONS, ...options};

    this.#rect = {
      x: resolved.x,
      y: resolved.y,
      width: resolved.width,
      height: resolved.height,
    };
    this.#label = resolved.label;
    this.#checked = resolved.checked;
    this.setDisabled(resolved.disabled);

    this.#colors = {
      normal: {
        fg: parseColor(resolved.colorFgNormal),
        bg: parseColor(resolved.colorBgNormal),
        cross: parseColor(resolved.colorCrossNormal),
        check: parseColor(resolved.colorCheckNormal),
        dim: parseColor(resolved.colorDimNormal),
      },
      hovered: {
        fg: parseColor(resolved.colorFgHovered),
        bg: parseColor(resolved.colorBgHovered),
        cross: parseColor(resolved.colorCrossHovered),
        check: parseColor(resolved.colorCheckHovered),
        dim: parseColor(resolved.colorDimHovered),
      },
      focused: {
        fg: parseColor(resolved.colorFgFocused),
        bg: parseColor(resolved.colorBgFocused),
        cross: parseColor(resolved.colorCrossFocused),
        check: parseColor(resolved.colorCheckFocused),
        dim: parseColor(resolved.colorDimFocused),
      },
      disabled: {
        fg: parseColor(resolved.colorFgDisabled),
        bg: parseColor(resolved.colorBgDisabled),
        cross: parseColor(resolved.colorCrossDisabled),
        check: parseColor(resolved.colorCheckDisabled),
        dim: parseColor(resolved.colorDimDisabled),
      },
    };

    this.on('click', () => {
      if (this.disabled) {
        return;
      }

      this.#toggle();
    });

    this.on('mouseover', () => {
      if (this.disabled) {
        return;
      }

      this.#hovered = true;
    });

    this.on('mouseout', () => {
      this.#hovered = false;
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

  handleKey(event: KeyboardEvent): void {
    if (this.disabled) {
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

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    Object.assign(this.#rect, rect);
  }

  override containsPoint(x: number, y: number): boolean {
    const {x: rx, y: ry, width: rw, height: rh} = this.#rect;
    return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
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
      hovered: this.#hovered,
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

    buffer.popClip();
  }

  #toggle(): void {
    this.#checked = !this.#checked;
    this.dispatch('change', {checked: this.#checked});
  }
}

export function createSwitchWidget(options?: Partial<SwitchWidgetOptions>): SwitchWidget {
  return new SwitchWidget({...DEFAULT_SWITCH_OPTIONS, ...options});
}

export default SwitchWidget;
