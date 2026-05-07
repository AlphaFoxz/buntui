import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {BorderSides} from '../../draw_list/types';
import type {TuiWidgetRect} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {type ColorScheme, resolveColorState} from '../color-scheme';
import {extractPercentSpec, isPercent} from '../../utils/percent';
import type {ButtonWidgetOptions} from './types';

type ButtonColors = {
  fg: number;
  bg: number;
  borderColor: number;
  borderStyle: number;
};

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

export class ButtonWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #value: string;

  #pressed = false;

  readonly #colors: ColorScheme<ButtonColors>;

  constructor(options: ButtonWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_BUTTON_OPTIONS, ...options};
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
    this.#value = resolved.value;
    this.setDisabled(resolved.disabled);

    this.#colors = {
      normal: {
        fg: parseColor(resolved.colorFgNormal),
        bg: parseColor(resolved.colorBgNormal),
        borderColor: parseColor(resolved.borderColorNormal),
        borderStyle: resolved.borderStyleNormal,
      },
      focused: {
        fg: parseColor(resolved.colorFgFocused),
        bg: parseColor(resolved.colorBgFocused),
        borderColor: parseColor(resolved.borderColorFocused),
        borderStyle: resolved.borderStyleFocused,
      },
      pressed: {
        fg: parseColor(resolved.colorFgPressed),
        bg: parseColor(resolved.colorBgPressed),
        borderColor: parseColor(resolved.borderColorPressed),
        borderStyle: resolved.borderStylePressed,
      },
      disabled: {
        fg: parseColor(resolved.colorFgDisabled),
        bg: parseColor(resolved.colorBgDisabled),
        borderColor: parseColor(resolved.borderColorDisabled),
        borderStyle: resolved.borderStyleDisabled,
      },
    };

    this.on('mousedown', () => {
      if (this.disabled) {
        return;
      }

      this.#pressed = true;
    });

    this.on('mouseup', () => {
      if (this.disabled) {
        return;
      }

      this.#pressed = false;
    });
  }

  override blur(): void {
    this.#pressed = false;
    super.blur();
  }

  handleKey(event: KeyboardEvent): void {
    if (this.disabled) {
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

  override get rect(): TuiWidgetRect {
    return this.#rect;
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
      pressed: this.#pressed,
      focused: this.focused,
    });

    buffer.drawRect({
      x,
      y,
      width,
      height,
      bgRgba: colors.bg,
    });

    if (this.#value.length > 0) {
      const innerWidth = width - 2;
      const innerHeight = height - 2;
      const textX = x + 1 + Math.max(0, Math.floor((innerWidth - this.#value.length) / 2));
      const textY = y + 1 + Math.floor(innerHeight / 2);
      const visibleText = this.#value.slice(0, Math.max(0, innerWidth));
      buffer.drawText({
        x: textX,
        y: textY,
        text: visibleText,
        fgRgba: colors.fg,
        bgRgba: 0x00_00_00_00,
      });
    }

    if (colors.borderStyle !== 0) {
      buffer.drawBorder({
        x,
        y,
        width,
        height,
        colorRgba: colors.borderColor,
        style: colors.borderStyle,
        sides: BorderSides.All,
      });
    }

    buffer.popClip();
  }
}

export function createButtonWidget(options?: Partial<ButtonWidgetOptions>): ButtonWidget {
  return new ButtonWidget({...DEFAULT_BUTTON_OPTIONS, ...options});
}

export default ButtonWidget;
