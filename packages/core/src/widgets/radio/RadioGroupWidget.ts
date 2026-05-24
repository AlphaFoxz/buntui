import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect, TuiWidgetSize} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {type ColorScheme, resolveColorState, applyColorSchemeUpdates} from '../color-scheme';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/resolve';
import type {RadioGroupWidgetOptions} from './types';

type RadioColors = {fg: number; bg: number};

const RADIO_TOKEN_MAP = {
  colorFgNormal: 'text',
  colorBgNormal: 'surface',
  colorFgFocused: 'text',
  colorBgFocused: 'surfaceHover',
  colorFgDisabled: 'textMuted',
  colorBgDisabled: 'surfaceDisabled',
  colorFgSelected: 'accent',
  colorBgSelected: 'surfaceFocused',
} as const;

function getDefaultRadioOptions(): Required<RadioGroupWidgetOptions> {
  return {
    x: 0,
    y: 0,
    width: 20,
    height: 3,
    options: [],
    value: -1,
    disabled: false,

    ...resolveWidgetColors(RADIO_TOKEN_MAP),
  };
}

export class RadioGroupWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #options: string[];
  #value: number;
  #hoveredIndex = -1;
  #focusedIndex = -1;

  readonly #colors: ColorScheme<RadioColors>;

  constructor(options: RadioGroupWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultRadioOptions(), ...options};
    this.#rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#options = resolved.options;
    this.#value = resolved.value;
    this.setDisabled(resolved.disabled);

    this.#colors = {
      normal: {
        fg: parseColor(resolved.colorFgNormal),
        bg: parseColor(resolved.colorBgNormal),
      },
      focused: {
        fg: parseColor(resolved.colorFgFocused),
        bg: parseColor(resolved.colorBgFocused),
      },
      disabled: {
        fg: parseColor(resolved.colorFgDisabled),
        bg: parseColor(resolved.colorBgDisabled),
      },
      selected: {
        fg: parseColor(resolved.colorFgSelected),
        bg: parseColor(resolved.colorBgSelected),
      },
    };

    this.on('mousedown', mouseData => {
      const innerY = mouseData.y - this.#rect.y;
      if (innerY >= 0 && innerY < this.#options.length) {
        this.#hoveredIndex = innerY;
        this.#select(this.#hoveredIndex);
      }
    });

    this.on('mouseover', mouseData => {
      const innerY = mouseData.y - this.#rect.y;
      if (innerY >= 0 && innerY < this.#options.length) {
        this.#hoveredIndex = innerY;
      }
    });

    this.on('mousemove', mouseData => {
      const innerY = mouseData.y - this.#rect.y;
      if (innerY >= 0 && innerY < this.#options.length) {
        this.#hoveredIndex = innerY;
      }
    });

    this.on('mouseout', () => {
      this.#hoveredIndex = -1;
    });
  }

  override handleActiveKey(event: KeyboardEvent): void {
    if (this.#options.length === 0) {
      return;
    }

    if (event.key === 'ArrowUp') {
      if (this.#focusedIndex <= 0) {
        this.#focusedIndex = this.#options.length - 1;
      } else {
        this.#focusedIndex--;
      }

      return;
    }

    if (event.key === 'ArrowDown') {
      this.#focusedIndex = (this.#focusedIndex + 1) % this.#options.length;
      return;
    }

    if (event.key === 'Home') {
      this.#focusedIndex = 0;
      return;
    }

    if (event.key === 'End') {
      this.#focusedIndex = this.#options.length - 1;
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && this.#focusedIndex >= 0) {
      this.#select(this.#focusedIndex);
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

  updateValue(index: number): void {
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

    if (this.#focusedIndex >= options.length) {
      this.#focusedIndex = Math.max(0, options.length - 1);
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

  updateThemeColors(resolved: Record<string, unknown>): void {
    applyColorSchemeUpdates(this.#colors, resolved);
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const {x, y, width, height} = this.#rect;
    if (width <= 0 || height <= 0) {
      return;
    }

    buffer.pushClip(x, y, width, height);

    const baseColors = resolveColorState(this.#colors, {
      disabled: this.disabled,
    });

    buffer.drawRect({
      x,
      y,
      width,
      height,
      bgRgba: baseColors.bg,
    });

    const visibleCount = Math.min(this.#options.length, height);
    for (let i = 0; i < visibleCount; i++) {
      const option = this.#options[i]!;
      const isSelected = i === this.#value;
      const isHovered = i === this.#hoveredIndex;
      const isFocused = i === this.#focusedIndex;
      const rowY = y + i;

      const indicator = isSelected ? '(●)' : '( )';
      const colors = resolveColorState(this.#colors, {
        disabled: this.disabled,
        selected: isSelected,
        hovered: isHovered,
        focused: isFocused,
      });

      if (colors.bg !== 0x00_00_00_00) {
        buffer.drawRect({
          x,
          y: rowY,
          width,
          height: 1,
          bgRgba: colors.bg,
        });
      }

      const maxLabelWidth = width - indicator.length - 1;
      const label = maxLabelWidth > 0 ? option.slice(0, Math.max(0, maxLabelWidth)) : '';
      const text = `${indicator} ${label}`;

      buffer.drawText({
        x,
        y: rowY,
        text,
        fgRgba: colors.fg,
        bgRgba: 0x00_00_00_00,
      });
    }

    buffer.popClip();
  }

  #select(index: number): void {
    this.#value = index;
    this.dispatch('change', {value: this.#value, label: this.#options[this.#value] ?? ''});
  }
}

export function createRadioGroupWidget(options?: Partial<RadioGroupWidgetOptions>): RadioGroupWidget {
  const widget = new RadioGroupWidget({...getDefaultRadioOptions(), ...options});
  bindThemeToWidget(widget, RADIO_TOKEN_MAP, options ?? {}, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default RadioGroupWidget;
