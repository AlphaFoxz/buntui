import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {getTheme} from '../../theme/provider';
import {extractPercentSpec, isPercent} from '../../utils/percent';
import type {RadioGroupWidgetOptions} from './types';

function getDefaultRadioOptions(): Required<RadioGroupWidgetOptions> {
  const theme = getTheme();
  return {
    x: 0,
    y: 0,
    width: 20,
    height: 3,
    options: [],
    value: -1,
    disabled: false,

    colorFgNormal: theme.colors.text,
    colorBgNormal: theme.colors.surface,

    colorFgFocused: theme.colors.text,
    colorBgFocused: theme.colors.surfaceHover,

    colorFgDisabled: theme.colors.textMuted,
    colorBgDisabled: theme.colors.surfaceDisabled,

    colorFgSelected: theme.colors.accent,
    colorBgSelected: theme.colors.surfaceFocused,
  };
}

export class RadioGroupWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #options: string[];
  #value: number;
  #hoveredIndex = -1;

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
    const resolved = {...getDefaultRadioOptions(), ...options};
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
    this.#options = resolved.options;
    this.#value = resolved.value;
    this.setDisabled(resolved.disabled);

    this.#colorFgNormal = parseColor(resolved.colorFgNormal);
    this.#colorBgNormal = parseColor(resolved.colorBgNormal);
    this.#colorFgFocused = parseColor(resolved.colorFgFocused);
    this.#colorBgFocused = parseColor(resolved.colorBgFocused);
    this.#colorFgDisabled = parseColor(resolved.colorFgDisabled);
    this.#colorBgDisabled = parseColor(resolved.colorBgDisabled);
    this.#colorFgSelected = parseColor(resolved.colorFgSelected);
    this.#colorBgSelected = parseColor(resolved.colorBgSelected);

    this.on('mousedown', mouseData => {
      if (this.disabled) {
        return;
      }

      const innerY = (mouseData.y - 1) - this.#rect.y;
      if (innerY >= 0 && innerY < this.#options.length) {
        this.#hoveredIndex = innerY;
        this.#select(this.#hoveredIndex);
      }
    });

    this.on('mouseover', mouseData => {
      if (this.disabled) {
        return;
      }

      const innerY = (mouseData.y - 1) - this.#rect.y;
      if (innerY >= 0 && innerY < this.#options.length) {
        this.#hoveredIndex = innerY;
      }
    });

    this.on('mousemove', mouseData => {
      if (this.disabled) {
        return;
      }

      const innerY = (mouseData.y - 1) - this.#rect.y;
      if (innerY >= 0 && innerY < this.#options.length) {
        this.#hoveredIndex = innerY;
      }
    });

    this.on('mouseout', () => {
      this.#hoveredIndex = -1;
    });
  }

  handleKey(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }

    if (event.key === undefined) {
      return;
    }

    this.dispatchKeyEvent(event);

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
  }

  override get rect(): TuiWidgetRect {
    return this.#rect;
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

    const baseFg = this.disabled ? this.#colorFgDisabled : this.#colorFgNormal;
    const baseBg = this.disabled ? this.#colorBgDisabled : this.#colorBgNormal;

    buffer.drawRect({
      x,
      y,
      width,
      height,
      bgRgba: baseBg,
    });

    const visibleCount = Math.min(this.#options.length, height);
    for (let i = 0; i < visibleCount; i++) {
      const option = this.#options[i]!;
      const isSelected = i === this.#value;
      const isHovered = i === this.#hoveredIndex;
      const rowY = y + i;

      const indicator = isSelected ? '(●)' : '( )';
      const fg = isSelected ? this.#colorFgSelected : (isHovered ? this.#colorFgFocused : baseFg);
      const bg = isSelected ? this.#colorBgSelected : (isHovered ? this.#colorBgFocused : 0x00_00_00_00);

      if (bg !== 0x00_00_00_00) {
        buffer.drawRect({
          x,
          y: rowY,
          width,
          height: 1,
          bgRgba: bg,
        });
      }

      const maxLabelWidth = width - indicator.length - 1;
      const label = maxLabelWidth > 0 ? option.slice(0, Math.max(0, maxLabelWidth)) : '';
      const text = `${indicator} ${label}`;

      buffer.drawText({
        x,
        y: rowY,
        text,
        fgRgba: fg,
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
  return new RadioGroupWidget({...getDefaultRadioOptions(), ...options});
}

export default RadioGroupWidget;
