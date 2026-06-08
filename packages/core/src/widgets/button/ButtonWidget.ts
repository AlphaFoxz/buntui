import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {BorderSides} from '../../draw_list/types';
import {
  resolveBorderStyle, type TuiBorderStyleName, type TuiWidgetRect, type TuiWidgetSize,
} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor, type TuiColor} from '../../utils/color';
import {type ColorScheme, resolveColorState, applyColorSchemeUpdates} from '../color-scheme';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/resolve';
import {resolveThemedOverrides} from '../../theme/themed-color';
import type {ButtonWidgetOptions} from './types';

type ButtonColors = {
  fg: number;
  bg: number;
  colorBorder: number;
  borderStyle: number;
};

const BUTTON_TOKEN_MAP = {
  colorFgNormal: 'text',
  colorBgNormal: 'surface',
  colorBorderNormal: 'border',
  borderStyleNormal: 'border.normal',
  colorFgFocused: 'text',
  colorBgFocused: 'surfaceFocused',
  colorBorderFocused: 'borderFocused',
  borderStyleFocused: 'border.focused',
  colorFgHovered: 'text',
  colorBgHovered: 'surfaceHover',
  colorBorderHovered: 'borderHover',
  borderStyleHovered: 'border.normal',
  colorFgPressed: 'text',
  colorBgPressed: 'surfacePressed',
  colorBorderPressed: 'borderFocused',
  borderStylePressed: 'border.pressed',
  colorFgDisabled: 'textMuted',
  colorBgDisabled: 'surfaceDisabled',
  colorBorderDisabled: 'surfaceFocused',
  borderStyleDisabled: 'border.disabled',
} as const;

function getDefaultButtonOptions(): Required<ButtonWidgetOptions> {
  return {
    x: 0,
    y: 0,
    width: 10,
    height: 3,
    value: '',

    ...resolveWidgetColors(BUTTON_TOKEN_MAP),

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
        colorBorder: parseColor(resolved.colorBorderNormal),
        borderStyle: resolveBorderStyle(resolved.borderStyleNormal),
      },
      focused: {
        fg: parseColor(resolved.colorFgFocused),
        bg: parseColor(resolved.colorBgFocused),
        colorBorder: parseColor(resolved.colorBorderFocused),
        borderStyle: resolveBorderStyle(resolved.borderStyleFocused),
      },
      hovered: {
        fg: parseColor(resolved.colorFgHovered),
        bg: parseColor(resolved.colorBgHovered),
        colorBorder: parseColor(resolved.colorBorderHovered),
        borderStyle: resolveBorderStyle(resolved.borderStyleHovered),
      },
      pressed: {
        fg: parseColor(resolved.colorFgPressed),
        bg: parseColor(resolved.colorBgPressed),
        colorBorder: parseColor(resolved.colorBorderPressed),
        borderStyle: resolveBorderStyle(resolved.borderStylePressed),
      },
      disabled: {
        fg: parseColor(resolved.colorFgDisabled),
        bg: parseColor(resolved.colorBgDisabled),
        colorBorder: parseColor(resolved.colorBorderDisabled),
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

  updateNormalStyle(options: {colorFgNormal?: TuiColor; colorBgNormal?: TuiColor; colorBorderNormal?: TuiColor; borderStyleNormal?: TuiBorderStyleName}): void {
    if (options.colorFgNormal !== undefined) {
      this.#colors.normal.fg = this._resolveColorValue(options.colorFgNormal, 'colorFgNormal');
    }

    if (options.colorBgNormal !== undefined) {
      this.#colors.normal.bg = this._resolveColorValue(options.colorBgNormal, 'colorBgNormal');
    }

    if (options.colorBorderNormal !== undefined) {
      this.#colors.normal.colorBorder = this._resolveColorValue(options.colorBorderNormal, 'colorBorderNormal');
    }

    if (options.borderStyleNormal !== undefined) {
      this.#colors.normal.borderStyle = resolveBorderStyle(options.borderStyleNormal);
    }
  }

  updateHoveredStyle(options: {colorFgHovered?: TuiColor; colorBgHovered?: TuiColor; colorBorderHovered?: TuiColor; borderStyleHovered?: TuiBorderStyleName}): void {
    if (options.colorFgHovered !== undefined) {
      this.#colors.hovered!.fg = this._resolveColorValue(options.colorFgHovered, 'colorFgHovered');
    }

    if (options.colorBgHovered !== undefined) {
      this.#colors.hovered!.bg = this._resolveColorValue(options.colorBgHovered, 'colorBgHovered');
    }

    if (options.colorBorderHovered !== undefined) {
      this.#colors.hovered!.colorBorder = this._resolveColorValue(options.colorBorderHovered, 'colorBorderHovered');
    }

    if (options.borderStyleHovered !== undefined) {
      this.#colors.hovered!.borderStyle = resolveBorderStyle(options.borderStyleHovered);
    }
  }

  updatePressedStyle(options: {colorFgPressed?: TuiColor; colorBgPressed?: TuiColor; colorBorderPressed?: TuiColor; borderStylePressed?: TuiBorderStyleName}): void {
    if (options.colorFgPressed !== undefined) {
      this.#colors.pressed!.fg = this._resolveColorValue(options.colorFgPressed, 'colorFgPressed');
    }

    if (options.colorBgPressed !== undefined) {
      this.#colors.pressed!.bg = this._resolveColorValue(options.colorBgPressed, 'colorBgPressed');
    }

    if (options.colorBorderPressed !== undefined) {
      this.#colors.pressed!.colorBorder = this._resolveColorValue(options.colorBorderPressed, 'colorBorderPressed');
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
        colorRgba: colors.colorBorder,
        style: colors.borderStyle,
        sides: BorderSides.All,
      });
    }

    buffer.popClip();
  }

  updateThemeColors(resolved: Record<string, unknown>): void {
    applyColorSchemeUpdates(this.#colors, resolved);
  }
}

export function createButtonWidget(options?: Partial<ButtonWidgetOptions>): ButtonWidget {
  const ctorOptions = resolveThemedOverrides(options ?? {}, BUTTON_TOKEN_MAP);
  const widget = new ButtonWidget({...getDefaultButtonOptions(), ...ctorOptions});
  widget.initTokenMap(BUTTON_TOKEN_MAP);
  bindThemeToWidget(widget, BUTTON_TOKEN_MAP, options ?? {}, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default ButtonWidget;
