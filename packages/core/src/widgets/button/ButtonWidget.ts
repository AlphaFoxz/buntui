import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent, type MouseEvent} from '../../events/types';
import {BorderSides} from '../../draw_list/types';
import type {TuiWidgetRect} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {Focusable} from '../Focusable';
import {parseColor} from '../../utils/color';
import type {ButtonWidgetOptions} from './types';

const DEFAULT_BUTTON_OPTIONS: Required<ButtonWidgetOptions> = {
  x: 0,
  y: 0,
  width: 10,
  height: 3,
  value: '',

  colorFgNormal: 0xFF_FF_FF_FF,
  colorBgNormal: 0x1E_1E_2E_FF,
  borderColorNormal: 0x45_47_5A_FF,
  borderStyleNormal: 1,

  colorFgFocused: 0xFF_FF_FF_FF,
  colorBgFocused: 0x31_32_44_FF,
  borderColorFocused: 0x89_B4_FA_FF,
  borderStyleFocused: 1,

  colorFgPressed: 0xFF_FF_FF_FF,
  colorBgPressed: 0x45_47_5A_FF,
  borderColorPressed: 0x89_B4_FA_FF,
  borderStylePressed: 4,

  colorFgDisabled: 0x6C_70_86_FF,
  colorBgDisabled: 0x18_18_25_FF,
  borderColorDisabled: 0x31_32_44_FF,
  borderStyleDisabled: 5,

  disabled: false,
};

export class ButtonWidget extends TuiWidgetEntity implements Focusable {
  #x: number;
  #y: number;
  #width: number;
  #height: number;
  #value: string;

  #focused = false;
  #pressed = false;
  #disabled: boolean;

  readonly #colorFgNormal: number;
  readonly #colorBgNormal: number;
  readonly #borderColorNormal: number;
  readonly #borderStyleNormal: number;

  readonly #colorFgFocused: number;
  readonly #colorBgFocused: number;
  readonly #borderColorFocused: number;
  readonly #borderStyleFocused: number;

  readonly #colorFgPressed: number;
  readonly #colorBgPressed: number;
  readonly #borderColorPressed: number;
  readonly #borderStylePressed: number;

  readonly #colorFgDisabled: number;
  readonly #colorBgDisabled: number;
  readonly #borderColorDisabled: number;
  readonly #borderStyleDisabled: number;

  constructor(options: ButtonWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_BUTTON_OPTIONS, ...options};

    this.#x = resolved.x;
    this.#y = resolved.y;
    this.#width = resolved.width;
    this.#height = resolved.height;
    this.#value = resolved.value;
    this.#disabled = resolved.disabled;

    this.#colorFgNormal = parseColor(resolved.colorFgNormal);
    this.#colorBgNormal = parseColor(resolved.colorBgNormal);
    this.#borderColorNormal = parseColor(resolved.borderColorNormal);
    this.#borderStyleNormal = resolved.borderStyleNormal;

    this.#colorFgFocused = parseColor(resolved.colorFgFocused);
    this.#colorBgFocused = parseColor(resolved.colorBgFocused);
    this.#borderColorFocused = parseColor(resolved.borderColorFocused);
    this.#borderStyleFocused = resolved.borderStyleFocused;

    this.#colorFgPressed = parseColor(resolved.colorFgPressed);
    this.#colorBgPressed = parseColor(resolved.colorBgPressed);
    this.#borderColorPressed = parseColor(resolved.borderColorPressed);
    this.#borderStylePressed = resolved.borderStylePressed;

    this.#colorFgDisabled = parseColor(resolved.colorFgDisabled);
    this.#colorBgDisabled = parseColor(resolved.colorBgDisabled);
    this.#borderColorDisabled = parseColor(resolved.borderColorDisabled);
    this.#borderStyleDisabled = resolved.borderStyleDisabled;

    this.on('mousedown', (data: unknown) => {
      if (this.#disabled) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const mouseData = data as MouseEvent;
      void mouseData;
      this.#pressed = true;
    });

    this.on('mouseup', (data: unknown) => {
      if (this.#disabled) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const mouseData = data as MouseEvent;
      void mouseData;
      this.#pressed = false;
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
    this.#pressed = false;
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
      this.dispatch('click', undefined);
    }
  }

  get value(): string {
    return this.#value;
  }

  updateValue(value: string): void {
    this.#value = value;
  }

  get disabled(): boolean {
    return this.#disabled;
  }

  setDisabled(value: boolean): void {
    this.#disabled = value;
  }

  override get rect(): TuiWidgetRect {
    return {
      x: this.#x,
      y: this.#y,
      width: this.#width,
      height: this.#height,
    };
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

    const state = this.#resolveVisualState();

    buffer.drawRect({
      x: this.#x,
      y: this.#y,
      width: this.#width,
      height: this.#height,
      bgRgba: state.bg,
    });

    if (this.#value.length > 0) {
      const innerWidth = this.#width - 2;
      const innerHeight = this.#height - 2;
      const textX = this.#x + 1 + Math.max(0, Math.floor((innerWidth - this.#value.length) / 2));
      const textY = this.#y + 1 + Math.floor(innerHeight / 2);
      const visibleText = this.#value.slice(0, Math.max(0, innerWidth));
      buffer.drawText({
        x: textX,
        y: textY,
        text: visibleText,
        fgRgba: state.fg,
        bgRgba: 0x00_00_00_00,
      });
    }

    if (state.borderStyle !== 0) {
      buffer.drawBorder({
        x: this.#x,
        y: this.#y,
        width: this.#width,
        height: this.#height,
        colorRgba: state.borderColor,
        style: state.borderStyle,
        sides: BorderSides.All,
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

  #resolveVisualState(): {fg: number; bg: number; borderColor: number; borderStyle: number} {
    if (this.#disabled) {
      return {
        fg: this.#colorFgDisabled,
        bg: this.#colorBgDisabled,
        borderColor: this.#borderColorDisabled,
        borderStyle: this.#borderStyleDisabled,
      };
    }

    if (this.#pressed) {
      return {
        fg: this.#colorFgPressed,
        bg: this.#colorBgPressed,
        borderColor: this.#borderColorPressed,
        borderStyle: this.#borderStylePressed,
      };
    }

    if (this.#focused) {
      return {
        fg: this.#colorFgFocused,
        bg: this.#colorBgFocused,
        borderColor: this.#borderColorFocused,
        borderStyle: this.#borderStyleFocused,
      };
    }

    return {
      fg: this.#colorFgNormal,
      bg: this.#colorBgNormal,
      borderColor: this.#borderColorNormal,
      borderStyle: this.#borderStyleNormal,
    };
  }
}

export function createButtonWidget(options?: Partial<ButtonWidgetOptions>): ButtonWidget {
  return new ButtonWidget({...DEFAULT_BUTTON_OPTIONS, ...options});
}

export default ButtonWidget;
