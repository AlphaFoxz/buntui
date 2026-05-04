import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {type ColorScheme, resolveColorState} from '../color-scheme';
import type {CheckboxWidgetOptions} from './types';

type CheckboxColors = {
  fg: number;
  bg: number;
};

const DEFAULT_CHECKBOX_OPTIONS: Required<CheckboxWidgetOptions> = {
  x: 0,
  y: 0,
  width: 10,
  height: 1,
  label: '',
  checked: false,
  disabled: false,

  colorFgNormal: 0xFF_FF_FF_FF,
  colorBgNormal: 0x1E_1E_2E_FF,

  colorFgHovered: 0xFF_FF_FF_FF,
  colorBgHovered: 0x45_47_5A_FF,

  colorFgFocused: 0xFF_FF_FF_FF,
  colorBgFocused: 0x31_32_44_FF,

  colorFgDisabled: 0x6C_70_86_FF,
  colorBgDisabled: 0x18_18_25_FF,
};

export class CheckboxWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #label: string;
  #checked: boolean;
  #hovered = false;

  readonly #colors: ColorScheme<CheckboxColors>;

  constructor(options: CheckboxWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_CHECKBOX_OPTIONS, ...options};

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
      },
      hovered: {
        fg: parseColor(resolved.colorFgHovered),
        bg: parseColor(resolved.colorBgHovered),
      },
      focused: {
        fg: parseColor(resolved.colorFgFocused),
        bg: parseColor(resolved.colorBgFocused),
      },
      disabled: {
        fg: parseColor(resolved.colorFgDisabled),
        bg: parseColor(resolved.colorBgDisabled),
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

    const {fg, bg} = resolveColorState(this.#colors, {
      disabled: this.disabled,
      focused: this.focused,
      hovered: this.#hovered,
    });

    buffer.drawRect({
      x,
      y,
      width,
      height,
      bgRgba: bg,
    });

    const indicator = this.#checked ? '[✓]' : '[ ]';
    const textY = y + Math.floor(height / 2);
    buffer.drawText({
      x,
      y: textY,
      text: indicator,
      fgRgba: fg,
      bgRgba: 0x00_00_00_00,
    });

    if (this.#label.length > 0) {
      const labelX = x + indicator.length + 1;
      const maxLabelWidth = width - indicator.length - 1;
      if (maxLabelWidth > 0) {
        const visibleLabel = this.#label.slice(0, Math.max(0, maxLabelWidth));
        buffer.drawText({
          x: labelX,
          y: textY,
          text: visibleLabel,
          fgRgba: fg,
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

export function createCheckboxWidget(options?: Partial<CheckboxWidgetOptions>): CheckboxWidget {
  return new CheckboxWidget({...DEFAULT_CHECKBOX_OPTIONS, ...options});
}

export default CheckboxWidget;
