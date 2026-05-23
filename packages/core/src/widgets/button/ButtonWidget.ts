import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {BorderSides} from '../../draw_list/types';
import {
  resolveBorderStyle, type TuiBorderStyleName, type TuiWidgetRect, type TuiWidgetSize,
} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor, type TuiColor} from '../../utils/color';
import {type ColorScheme, resolveColorState} from '../color-scheme';
import {getTheme} from '../../theme/provider';
import type {ButtonWidgetOptions} from './types';

type ButtonColors = {
  fg: number;
  bg: number;
  borderColor: number;
  borderStyle: number;
};

function getDefaultButtonOptions(): Required<ButtonWidgetOptions> {
  const theme = getTheme();
  return {
    x: 0,
    y: 0,
    width: 10,
    height: 3,
    value: '',

    colorFgNormal: theme.colors.text,
    colorBgNormal: theme.colors.surface,
    borderColorNormal: theme.colors.border,
    borderStyleNormal: theme.borderStyle.normal,

    colorFgFocused: theme.colors.text,
    colorBgFocused: theme.colors.surfaceFocused,
    borderColorFocused: theme.colors.borderFocused,
    borderStyleFocused: theme.borderStyle.focused,

    colorFgHovered: theme.colors.text,
    colorBgHovered: theme.colors.surfaceHover,
    borderColorHovered: theme.colors.border,
    borderStyleHovered: theme.borderStyle.normal,

    colorFgPressed: theme.colors.text,
    colorBgPressed: theme.colors.surfacePressed,
    borderColorPressed: theme.colors.borderFocused,
    borderStylePressed: theme.borderStyle.pressed,

    colorFgDisabled: theme.colors.textMuted,
    colorBgDisabled: theme.colors.surfaceDisabled,
    borderColorDisabled: theme.colors.surfaceFocused,
    borderStyleDisabled: theme.borderStyle.disabled,

    disabled: false,
  };
}

export class ButtonWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #value: string;

  #pressed = false;

  readonly #colors: ColorScheme<ButtonColors>;

  constructor(options: ButtonWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultButtonOptions(), ...options};
    this.#rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#value = resolved.value;
    this.setDisabled(resolved.disabled);

    this.#colors = {
      normal: {
        fg: parseColor(resolved.colorFgNormal),
        bg: parseColor(resolved.colorBgNormal),
        borderColor: parseColor(resolved.borderColorNormal),
        borderStyle: resolveBorderStyle(resolved.borderStyleNormal),
      },
      focused: {
        fg: parseColor(resolved.colorFgFocused),
        bg: parseColor(resolved.colorBgFocused),
        borderColor: parseColor(resolved.borderColorFocused),
        borderStyle: resolveBorderStyle(resolved.borderStyleFocused),
      },
      hovered: {
        fg: parseColor(resolved.colorFgHovered),
        bg: parseColor(resolved.colorBgHovered),
        borderColor: parseColor(resolved.borderColorHovered),
        borderStyle: resolveBorderStyle(resolved.borderStyleHovered),
      },
      pressed: {
        fg: parseColor(resolved.colorFgPressed),
        bg: parseColor(resolved.colorBgPressed),
        borderColor: parseColor(resolved.borderColorPressed),
        borderStyle: resolveBorderStyle(resolved.borderStylePressed),
      },
      disabled: {
        fg: parseColor(resolved.colorFgDisabled),
        bg: parseColor(resolved.colorBgDisabled),
        borderColor: parseColor(resolved.borderColorDisabled),
        borderStyle: resolveBorderStyle(resolved.borderStyleDisabled),
      },
    };

    this.on('mousedown', () => {
      this.#pressed = true;
    });

    this.on('mouseup', () => {
      this.#pressed = false;
    });
  }

  override blur(): void {
    this.#pressed = false;
    super.blur();
  }

  override handleActiveKey(event: KeyboardEvent): void {
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

  updateNormalStyle(options: {colorFgNormal?: TuiColor; colorBgNormal?: TuiColor; borderColorNormal?: TuiColor; borderStyleNormal?: TuiBorderStyleName}): void {
    if (options.colorFgNormal !== undefined) {
      this.#colors.normal.fg = parseColor(options.colorFgNormal);
    }

    if (options.colorBgNormal !== undefined) {
      this.#colors.normal.bg = parseColor(options.colorBgNormal);
    }

    if (options.borderColorNormal !== undefined) {
      this.#colors.normal.borderColor = parseColor(options.borderColorNormal);
    }

    if (options.borderStyleNormal !== undefined) {
      this.#colors.normal.borderStyle = resolveBorderStyle(options.borderStyleNormal);
    }
  }

  updateHoveredStyle(options: {colorFgHovered?: TuiColor; colorBgHovered?: TuiColor; borderColorHovered?: TuiColor; borderStyleHovered?: TuiBorderStyleName}): void {
    if (options.colorFgHovered !== undefined) {
      this.#colors.hovered!.fg = parseColor(options.colorFgHovered);
    }

    if (options.colorBgHovered !== undefined) {
      this.#colors.hovered!.bg = parseColor(options.colorBgHovered);
    }

    if (options.borderColorHovered !== undefined) {
      this.#colors.hovered!.borderColor = parseColor(options.borderColorHovered);
    }

    if (options.borderStyleHovered !== undefined) {
      this.#colors.hovered!.borderStyle = resolveBorderStyle(options.borderStyleHovered);
    }
  }

  updatePressedStyle(options: {colorFgPressed?: TuiColor; colorBgPressed?: TuiColor; borderColorPressed?: TuiColor; borderStylePressed?: TuiBorderStyleName}): void {
    if (options.colorFgPressed !== undefined) {
      this.#colors.pressed!.fg = parseColor(options.colorFgPressed);
    }

    if (options.colorBgPressed !== undefined) {
      this.#colors.pressed!.bg = parseColor(options.colorBgPressed);
    }

    if (options.borderColorPressed !== undefined) {
      this.#colors.pressed!.borderColor = parseColor(options.borderColorPressed);
    }

    if (options.borderStylePressed !== undefined) {
      this.#colors.pressed!.borderStyle = resolveBorderStyle(options.borderStylePressed);
    }
  }

  override get rect(): TuiWidgetRect {
    return this.#rect;
  }

  override intrinsicSize(): TuiWidgetSize | undefined {
    return {width: this.#rect.width, height: this.#rect.height};
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

    const colors = resolveColorState(this.#colors, {
      disabled: this.disabled,
      pressed: this.#pressed,
      hovered: this.hovered,
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
  return new ButtonWidget({...getDefaultButtonOptions(), ...options});
}

export default ButtonWidget;
