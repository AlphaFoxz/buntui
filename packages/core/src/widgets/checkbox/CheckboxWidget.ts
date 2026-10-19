import type {DrawListBuffer} from '../../draw-list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {BorderSides} from '../../draw-list/types';
import {
  resolveBorderStyle,
  type TuiBorderStyleName,
  type TuiWidgetRect,
  type TuiWidgetSize,
} from '../types';
import {resolveColorState} from '../color-scheme';
import {ThemedWidget} from '../ThemedWidget';
import type {CheckboxWidgetOptions} from './types';

type CheckboxColors = {
  fg: number;
  bg: number;
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

function getDefaultCheckboxOptions() {
  return {
    x: 0,
    y: 0,
    width: 10,
    height: 1,
    label: '',
    checked: false,
    indeterminate: false,
    disabled: false,
  };
}

export class CheckboxWidget extends ThemedWidget<CheckboxColors> {
  static override readonly TOKEN_MAP = CHECKBOX_TOKEN_MAP;

  readonly #rect: TuiWidgetRect;
  #label: string;
  #checked: boolean;
  #indeterminate: boolean;

  constructor(options: CheckboxWidgetOptions = {}) {
    super(options);
    const resolved = {...getDefaultCheckboxOptions(), ...options};
    this.#rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#label = resolved.label;
    this.#checked = resolved.checked;
    this.#indeterminate = resolved.indeterminate ?? false;
    this.setDisabled(resolved.disabled);

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

  setChecked(isChecked: boolean): void {
    this.#checked = isChecked;
  }

  setIndeterminate(isIndeterminate: boolean): void {
    this.#indeterminate = isIndeterminate;
  }

  setLabel(text: string): void {
    this.#label = text;
  }

  updateBorder(options: {borderStyle?: TuiBorderStyleName}): void {
    if (options.borderStyle === undefined) {
      return;
    }

    this.colors.focused!.borderStyle = resolveBorderStyle(options.borderStyle);
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

    const {fg, bg} = resolveColorState(this.colors, {
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

    if (this.focused && !this.disabled && this.colors.focused!.borderStyle !== 0) {
      buffer.drawBorder({
        x,
        y,
        width,
        height,
        colorRgba: this.colors.focused!.colorBorder,
        style: this.colors.focused!.borderStyle,
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
  return new CheckboxWidget(options ?? {});
}

export default CheckboxWidget;
