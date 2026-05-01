import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent, type MouseEvent} from '../../events/types';
import {BorderSides} from '../../draw_list/types';
import type {TuiWidgetRect} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {Focusable} from '../Focusable';
import type {ButtonWidgetOptions} from './types';

const DEFAULT_BUTTON_OPTIONS: Required<ButtonWidgetOptions> = {
  rectX: 0,
  rectY: 0,
  rectWidth: 10,
  rectHeight: 3,
  text: '',

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
  #rectX: number;
  #rectY: number;
  #rectWidth: number;
  #rectHeight: number;
  #text: string;

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

    this.#rectX = resolved.rectX;
    this.#rectY = resolved.rectY;
    this.#rectWidth = resolved.rectWidth;
    this.#rectHeight = resolved.rectHeight;
    this.#text = resolved.text;
    this.#disabled = resolved.disabled;

    this.#colorFgNormal = resolved.colorFgNormal;
    this.#colorBgNormal = resolved.colorBgNormal;
    this.#borderColorNormal = resolved.borderColorNormal;
    this.#borderStyleNormal = resolved.borderStyleNormal;

    this.#colorFgFocused = resolved.colorFgFocused;
    this.#colorBgFocused = resolved.colorBgFocused;
    this.#borderColorFocused = resolved.borderColorFocused;
    this.#borderStyleFocused = resolved.borderStyleFocused;

    this.#colorFgPressed = resolved.colorFgPressed;
    this.#colorBgPressed = resolved.colorBgPressed;
    this.#borderColorPressed = resolved.borderColorPressed;
    this.#borderStylePressed = resolved.borderStylePressed;

    this.#colorFgDisabled = resolved.colorFgDisabled;
    this.#colorBgDisabled = resolved.colorBgDisabled;
    this.#borderColorDisabled = resolved.borderColorDisabled;
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

  get text(): string {
    return this.#text;
  }

  setText(text: string): void {
    this.#text = text;
  }

  updateText(text: string): void {
    this.#text = text;
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

    const state = this.#resolveVisualState();

    buffer.drawRect({
      x: this.#rectX,
      y: this.#rectY,
      width: this.#rectWidth,
      height: this.#rectHeight,
      bgRgba: state.bg,
    });

    if (this.#text.length > 0) {
      const innerWidth = this.#rectWidth - 2;
      const innerHeight = this.#rectHeight - 2;
      const textX = this.#rectX + 1 + Math.max(0, Math.floor((innerWidth - this.#text.length) / 2));
      const textY = this.#rectY + 1 + Math.floor(innerHeight / 2);
      const visibleText = this.#text.slice(0, Math.max(0, innerWidth));
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
        x: this.#rectX,
        y: this.#rectY,
        width: this.#rectWidth,
        height: this.#rectHeight,
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
