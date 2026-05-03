import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {Focusable} from '../Focusable';
import {parseColor} from '../../utils/color';
import type {CheckboxWidgetOptions} from './types';

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

export class CheckboxWidget extends TuiWidgetEntity implements Focusable {
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
  readonly #colorFgHovered: number;
  readonly #colorBgHovered: number;
  readonly #colorFgFocused: number;
  readonly #colorBgFocused: number;
  readonly #colorFgDisabled: number;
  readonly #colorBgDisabled: number;

  constructor(options: CheckboxWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_CHECKBOX_OPTIONS, ...options};

    this.#x = resolved.x;
    this.#y = resolved.y;
    this.#width = resolved.width;
    this.#height = resolved.height;
    this.#label = resolved.label;
    this.#checked = resolved.checked;
    this.#disabled = resolved.disabled;

    this.#colorFgNormal = parseColor(resolved.colorFgNormal);
    this.#colorBgNormal = parseColor(resolved.colorBgNormal);
    this.#colorFgHovered = parseColor(resolved.colorFgHovered);
    this.#colorBgHovered = parseColor(resolved.colorBgHovered);
    this.#colorFgFocused = parseColor(resolved.colorFgFocused);
    this.#colorBgFocused = parseColor(resolved.colorBgFocused);
    this.#colorFgDisabled = parseColor(resolved.colorFgDisabled);
    this.#colorBgDisabled = parseColor(resolved.colorBgDisabled);

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

    const {fg, bg} = this.#resolveColors();

    buffer.drawRect({
      x: this.#x,
      y: this.#y,
      width: this.#width,
      height: this.#height,
      bgRgba: bg,
    });

    const indicator = this.#checked ? '[✓]' : '[ ]';
    const textY = this.#y + Math.floor(this.#height / 2);
    buffer.drawText({
      x: this.#x,
      y: textY,
      text: indicator,
      fgRgba: fg,
      bgRgba: 0x00_00_00_00,
    });

    if (this.#label.length > 0) {
      const labelX = this.#x + indicator.length + 1;
      const maxLabelWidth = this.#width - indicator.length - 1;
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

  #resolveColors(): {fg: number; bg: number} {
    if (this.#disabled) {
      return {fg: this.#colorFgDisabled, bg: this.#colorBgDisabled};
    }

    if (this.#hovered) {
      return {fg: this.#colorFgHovered, bg: this.#colorBgHovered};
    }

    if (this.#focused) {
      return {fg: this.#colorFgFocused, bg: this.#colorBgFocused};
    }

    return {fg: this.#colorFgNormal, bg: this.#colorBgNormal};
  }
}

export function createCheckboxWidget(options?: Partial<CheckboxWidgetOptions>): CheckboxWidget {
  return new CheckboxWidget({...DEFAULT_CHECKBOX_OPTIONS, ...options});
}

export default CheckboxWidget;
