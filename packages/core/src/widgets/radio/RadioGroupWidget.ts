import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent, type MouseEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {Focusable} from '../Focusable';
import type {RadioGroupWidgetOptions} from './types';

const DEFAULT_RADIO_OPTIONS: Required<RadioGroupWidgetOptions> = {
  rectX: 0,
  rectY: 0,
  rectWidth: 20,
  rectHeight: 3,
  options: [],
  value: -1,
  disabled: false,

  colorFgNormal: 0xFF_FF_FF_FF,
  colorBgNormal: 0x1E_1E_2E_FF,

  colorFgFocused: 0xFF_FF_FF_FF,
  colorBgFocused: 0x45_47_5A_FF,

  colorFgDisabled: 0x6C_70_86_FF,
  colorBgDisabled: 0x18_18_25_FF,

  colorFgSelected: 0x89_B4_FA_FF,
  colorBgSelected: 0x31_32_44_FF,
};

export class RadioGroupWidget extends TuiWidgetEntity implements Focusable {
  #rectX: number;
  #rectY: number;
  #rectWidth: number;
  #rectHeight: number;
  #options: string[];
  #value: number;
  #hoveredIndex = -1;
  #focused = false;
  #disabled: boolean;

  readonly #colorFgNormal: number;
  readonly #colorBgNormal: number;
  readonly #colorFgFocused: number;
  readonly #colorBgFocused: number;
  readonly #colorFgDisabled: number;
  readonly #colorBgDisabled: number;
  readonly #colorFgSelected: number;
  readonly #colorBgSelected: number;

  constructor(options: RadioGroupWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_RADIO_OPTIONS, ...options};

    this.#rectX = resolved.rectX;
    this.#rectY = resolved.rectY;
    this.#rectWidth = resolved.rectWidth;
    this.#rectHeight = resolved.rectHeight;
    this.#options = resolved.options;
    this.#value = resolved.value;
    this.#disabled = resolved.disabled;

    this.#colorFgNormal = resolved.colorFgNormal;
    this.#colorBgNormal = resolved.colorBgNormal;
    this.#colorFgFocused = resolved.colorFgFocused;
    this.#colorBgFocused = resolved.colorBgFocused;
    this.#colorFgDisabled = resolved.colorFgDisabled;
    this.#colorBgDisabled = resolved.colorBgDisabled;
    this.#colorFgSelected = resolved.colorFgSelected;
    this.#colorBgSelected = resolved.colorBgSelected;

    this.on('mousedown', (data: unknown) => {
      if (this.#disabled) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const mouseData = data as MouseEvent;
      const innerY = (mouseData.y - 1) - this.#rectY;
      if (innerY >= 0 && innerY < this.#options.length) {
        this.#hoveredIndex = innerY;
        this.#select(this.#hoveredIndex);
      }
    });

    this.on('mouseover', (data: unknown) => {
      if (this.#disabled) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const mouseData = data as MouseEvent;
      const innerY = (mouseData.y - 1) - this.#rectY;
      if (innerY >= 0 && innerY < this.#options.length) {
        this.#hoveredIndex = innerY;
      }
    });

    this.on('mousemove', (data: unknown) => {
      if (this.#disabled) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const mouseData = data as MouseEvent;
      const innerY = (mouseData.y - 1) - this.#rectY;
      if (innerY >= 0 && innerY < this.#options.length) {
        this.#hoveredIndex = innerY;
      }
    });

    this.on('mouseout', () => {
      this.#hoveredIndex = -1;
    });
  }

  get acceptsFocus(): boolean {
    return !this.#disabled;
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

    if (this.#options.length === 0) {
      return;
    }

    if (event.key === 'ArrowUp') {
      if (this.#hoveredIndex <= 0) {
        this.#hoveredIndex = this.#options.length - 1;
      } else {
        this.#hoveredIndex--;
      }

      return;
    }

    if (event.key === 'ArrowDown') {
      this.#hoveredIndex = (this.#hoveredIndex + 1) % this.#options.length;
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && this.#hoveredIndex >= 0) {
      this.#select(this.#hoveredIndex);
    }
  }

  get value(): number {
    return this.#value;
  }

  get selectedLabel(): string {
    if (this.#value < 0 || this.#value >= this.#options.length) {
      return '';
    }

    return this.#options[this.#value] ?? '';
  }

  setValue(index: number): void {
    this.#value = index;
  }

  get options(): string[] {
    return this.#options;
  }

  setOptions(options: string[]): void {
    this.#options = options;
    if (this.#value >= options.length) {
      this.#value = -1;
    }

    if (this.#hoveredIndex >= options.length) {
      this.#hoveredIndex = Math.max(0, options.length - 1);
    }
  }

  get disabled(): boolean {
    return this.#disabled;
  }

  setDisabled(value: boolean): void {
    this.#disabled = value;
  }

  override get rect(): TuiWidgetRect {
    return {
      rectX: this.#rectX,
      rectY: this.#rectY,
      rectWidth: this.#rectWidth,
      rectHeight: this.#rectHeight,
    };
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

    const baseFg = this.#disabled ? this.#colorFgDisabled : this.#colorFgNormal;
    const baseBg = this.#disabled ? this.#colorBgDisabled : this.#colorBgNormal;

    buffer.drawRect({
      x: this.#rectX,
      y: this.#rectY,
      width: this.#rectWidth,
      height: this.#rectHeight,
      bgRgba: baseBg,
    });

    const visibleCount = Math.min(this.#options.length, this.#rectHeight);
    for (let i = 0; i < visibleCount; i++) {
      const option = this.#options[i]!;
      const isSelected = i === this.#value;
      const isHovered = i === this.#hoveredIndex;
      const y = this.#rectY + i;

      const indicator = isSelected ? '(●)' : '( )';
      const fg = isSelected ? this.#colorFgSelected : (isHovered ? this.#colorFgFocused : baseFg);
      const bg = isSelected ? this.#colorBgSelected : (isHovered ? this.#colorBgFocused : 0x00_00_00_00);

      if (bg !== 0x00_00_00_00) {
        buffer.drawRect({
          x: this.#rectX,
          y,
          width: this.#rectWidth,
          height: 1,
          bgRgba: bg,
        });
      }

      const maxLabelWidth = this.#rectWidth - indicator.length - 1;
      const label = maxLabelWidth > 0 ? option.slice(0, Math.max(0, maxLabelWidth)) : '';
      const text = `${indicator} ${label}`;

      buffer.drawText({
        x: this.#rectX,
        y,
        text,
        fgRgba: fg,
        bgRgba: 0x00_00_00_00,
      });
    }

    buffer.popClip();
  }

  override unmounted(): void {
    if (this.#focused) {
      this.blur();
    }

    super.unmounted();
  }

  #select(index: number): void {
    this.#value = index;
    this.dispatch('change', {value: this.#value, label: this.#options[this.#value] ?? ''});
  }
}

export function createRadioGroupWidget(options?: Partial<RadioGroupWidgetOptions>): RadioGroupWidget {
  return new RadioGroupWidget({...DEFAULT_RADIO_OPTIONS, ...options});
}

export default RadioGroupWidget;
