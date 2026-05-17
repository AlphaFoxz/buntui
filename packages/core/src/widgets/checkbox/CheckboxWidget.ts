import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {type ColorScheme, resolveColorState} from '../color-scheme';
import {getTheme} from '../../theme/provider';
import type {CheckboxWidgetOptions} from './types';

type CheckboxColors = {
  fg: number;
  bg: number;
};

function getDefaultCheckboxOptions(): Required<CheckboxWidgetOptions> {
  const theme = getTheme();
  return {
    x: 0,
    y: 0,
    width: 10,
    height: 1,
    label: '',
    checked: false,
    disabled: false,

    colorFgNormal: theme.colors.text,
    colorBgNormal: theme.colors.surface,

    colorFgHovered: theme.colors.text,
    colorBgHovered: theme.colors.surfaceHover,

    colorFgFocused: theme.colors.text,
    colorBgFocused: theme.colors.surfaceFocused,

    colorFgDisabled: theme.colors.textMuted,
    colorBgDisabled: theme.colors.surfaceDisabled,
  };
}

export class CheckboxWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #label: string;
  #checked: boolean;
  #hovered = false;

  readonly #colors: ColorScheme<CheckboxColors>;

  constructor(options: CheckboxWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultCheckboxOptions(), ...options};
    this.#rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
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

    this.dispatchKeyEvent(event);

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
  return new CheckboxWidget({...getDefaultCheckboxOptions(), ...options});
}

export default CheckboxWidget;
