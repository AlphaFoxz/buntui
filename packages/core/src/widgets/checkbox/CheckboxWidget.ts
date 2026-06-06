import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {BorderSides} from '../../draw_list/types';
import {
  resolveBorderStyle, type TuiWidgetRect, type TuiWidgetSize,
} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {type ColorScheme, resolveColorState, applyColorSchemeUpdates} from '../color-scheme';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/resolve';
import type {CheckboxWidgetOptions} from './types';

type CheckboxColors = {
  fg: number;
  bg: number;
};

type CheckboxBorderColors = {
  colorBorder: number;
  borderStyle: number;
};

const CHECKBOX_TOKEN_MAP = {
  colorFgNormal: 'text',
  colorBgNormal: 'surface',
  colorFgHovered: 'text',
  colorBgHovered: 'surfaceHover',
  colorFgFocused: 'text',
  colorBgFocused: 'surfaceFocused',
  colorBorderFocused: 'borderFocused',
  borderStyleFocused: 'border.focused',
  colorFgDisabled: 'textMuted',
  colorBgDisabled: 'surfaceDisabled',
} as const;

function getDefaultCheckboxOptions(): Required<CheckboxWidgetOptions> {
  return {
    x: 0,
    y: 0,
    width: 10,
    height: 1,
    label: '',
    checked: false,
    indeterminate: false,
    disabled: false,

    ...resolveWidgetColors(CHECKBOX_TOKEN_MAP),
  };
}

export class CheckboxWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #label: string;
  #checked: boolean;
  #indeterminate: boolean;

  readonly #colors: ColorScheme<CheckboxColors>;
  readonly #focusBorder: CheckboxBorderColors;

  constructor(options: CheckboxWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultCheckboxOptions(), ...options};
    this.#rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#label = resolved.label;
    this.#checked = resolved.checked;
    this.#indeterminate = resolved.indeterminate ?? false;
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

    this.#focusBorder = {
      colorBorder: parseColor(resolved.colorBorderFocused),
      borderStyle: resolveBorderStyle(resolved.borderStyleFocused),
    };

    this.on('click', () => {
      this.#toggle();
    });
  }

  get checked(): boolean {
    return this.#checked;
  }

  get indeterminate(): boolean {
    return this.#indeterminate;
  }

  get label(): string {
    return this.#label;
  }

  override get rect(): TuiWidgetRect {
    return this.#rect;
  }

  override intrinsicSize(): TuiWidgetSize | undefined {
    return {width: this.#rect.width, height: this.#rect.height};
  }

  override handleActiveKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      this.#toggle();
    }
  }

  setChecked(value: boolean): void {
    this.#checked = value;
  }

  setIndeterminate(value: boolean): void {
    this.#indeterminate = value;
  }

  setLabel(text: string): void {
    this.#label = text;
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    Object.assign(this.#rect, rect);
  }

  updateThemeColors(resolved: Record<string, unknown>): void {
    applyColorSchemeUpdates(this.#colors, resolved);

    if (resolved.colorBorderFocused !== undefined) {
      this.#focusBorder.colorBorder = parseColor(resolved.colorBorderFocused);
    }

    if (resolved.borderStyleFocused !== undefined) {
      this.#focusBorder.borderStyle = resolveBorderStyle(resolved.borderStyleFocused);
    }
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
      hovered: this.hovered,
    });

    buffer.drawRect({
      x,
      y,
      width,
      height,
      bgRgba: bg,
    });

    const indicator = this.#indeterminate ? '[-]' : (this.#checked ? '[✓]' : '[ ]');
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

    if (this.focused && !this.disabled && this.#focusBorder.borderStyle !== 0) {
      buffer.drawBorder({
        x,
        y,
        width,
        height,
        colorRgba: this.#focusBorder.colorBorder,
        style: this.#focusBorder.borderStyle,
        sides: BorderSides.All,
      });
    }

    buffer.popClip();
  }

  #toggle(): void {
    if (this.#indeterminate) {
      this.#indeterminate = false;
      this.#checked = true;
    } else {
      this.#checked = !this.#checked;
    }

    this.dispatch('change', {checked: this.#checked, indeterminate: this.#indeterminate});
  }
}

export function createCheckboxWidget(options?: Partial<CheckboxWidgetOptions>): CheckboxWidget {
  const widget = new CheckboxWidget({...getDefaultCheckboxOptions(), ...options});
  bindThemeToWidget(widget, CHECKBOX_TOKEN_MAP, options ?? {}, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default CheckboxWidget;
