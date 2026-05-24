import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {type ColorScheme, resolveColorState} from '../color-scheme';
import {resolveWidgetColors} from '../../theme/resolve';
import type {SelectButtonWidgetOptions} from './types';

type SelectButtonColors = {fg: number; bg: number};

function getDefaultSelectButtonOptions() {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 1,
    options: [] as unknown[],
    value: undefined as unknown,
    disabled: false,

    ...resolveWidgetColors({
      colorFgNormal: 'textMuted',
      colorBgNormal: 'surface',
      colorFgActive: 'text',
      colorBgActive: 'surfaceFocused',
      colorFgFocused: 'accent',
      colorBgFocused: 'surfaceHover',
      colorFgDisabled: 'textMuted',
      colorBgDisabled: 'surfaceDisabled',
      colorFgSeparator: 'border',
    }),
  };
}

export class SelectButtonWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #options: unknown[];
  #selectedIndex: number;
  #hoveredIndex = -1;

  readonly #colors: ColorScheme<SelectButtonColors>;
  readonly #colorSeparator: number;

  constructor(options: SelectButtonWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultSelectButtonOptions(), ...options};
    this.#rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#options = resolved.options;
    this.setDisabled(resolved.disabled);

    if (resolved.value === undefined) {
      this.#selectedIndex = this.#options.length > 0 ? 0 : -1;
    } else {
      this.#selectedIndex = this.#options.indexOf(resolved.value);
    }

    this.#colors = {
      normal: {
        fg: parseColor(resolved.colorFgNormal),
        bg: parseColor(resolved.colorBgNormal),
      },
      active: {
        fg: parseColor(resolved.colorFgActive),
        bg: parseColor(resolved.colorBgActive),
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
    this.#colorSeparator = parseColor(resolved.colorFgSeparator);

    this.on('mousedown', mouseData => {
      const index = this.#hitTestOption(mouseData.x);
      if (index >= 0) {
        this.#select(index);
      }
    });

    this.on('mousemove', mouseData => {
      this.#hoveredIndex = this.#hitTestOption(mouseData.x);
    });

    this.on('mouseover', mouseData => {
      this.#hoveredIndex = this.#hitTestOption(mouseData.x);
    });

    this.on('mouseout', () => {
      this.#hoveredIndex = -1;
    });
  }

  override blur(): void {
    this.#hoveredIndex = -1;
    super.blur();
  }

  override handleActiveKey(event: KeyboardEvent): void {
    if (this.#options.length === 0 || this.#selectedIndex < 0) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      const newIdx = (this.#selectedIndex - 1 + this.#options.length) % this.#options.length;
      this.#select(newIdx);
      return;
    }

    if (event.key === 'ArrowRight') {
      const newIdx = (this.#selectedIndex + 1) % this.#options.length;
      this.#select(newIdx);
      return;
    }

    if (event.key === 'Home') {
      this.#select(0);
      return;
    }

    if (event.key === 'End') {
      this.#select(this.#options.length - 1);
    }
  }

  get value(): unknown {
    return this.#selectedIndex >= 0 ? this.#options[this.#selectedIndex] : undefined;
  }

  get activeLabel(): string {
    if (this.#selectedIndex < 0 || this.#selectedIndex >= this.#options.length) {
      return '';
    }

    return String(this.#options[this.#selectedIndex]);
  }

  updateValue(value: unknown): void {
    const idx = this.#options.indexOf(value);
    if (idx !== -1) {
      this.#selectedIndex = idx;
    }
  }

  override intrinsicSize(): {width: number; height: number} | undefined {
    if (this.#options.length === 0) {
      return {width: 0, height: this.#rect.height};
    }

    const layout = this.#computeLayout();
    if (layout.length === 0) {
      return {width: 0, height: this.#rect.height};
    }

    const last = layout.at(-1)!;
    return {width: last.x + last.width - this.#rect.x, height: this.#rect.height};
  }

  get options(): unknown[] {
    return this.#options;
  }

  setOptions(options: unknown[]): void {
    const currentValue = this.#selectedIndex >= 0 ? this.#options[this.#selectedIndex] : undefined;
    this.#options = options;
    if (currentValue === undefined) {
      this.#selectedIndex = options.length > 0 ? 0 : -1;
    } else {
      const newIdx = options.indexOf(currentValue);
      this.#selectedIndex = newIdx === -1 ? (options.length > 0 ? 0 : -1) : newIdx;
    }
  }

  override get rect(): TuiWidgetRect {
    return {
      x: this.#rect.x,
      y: this.#rect.y,
      width: this.#effectiveWidth(),
      height: this.#rect.height,
    };
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    Object.assign(this.#rect, rect);
  }

  override containsPoint(x: number, y: number): boolean {
    const w = this.#effectiveWidth();
    return x >= this.#rect.x
      && x < this.#rect.x + w
      && y >= this.#rect.y
      && y < this.#rect.y + this.#rect.height;
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const {x, y, height} = this.#rect;
    const w = this.#effectiveWidth();
    if (w <= 0 || height <= 0 || this.#options.length === 0) {
      return;
    }

    buffer.pushClip(x, y, w, height);

    const baseColors = resolveColorState(this.#colors, {
      disabled: this.disabled,
    });
    buffer.drawRect({
      x,
      y,
      width: w,
      height,
      bgRgba: baseColors.bg,
    });

    const layout = this.#computeLayout();

    for (let i = 0; i < layout.length; i++) {
      const {x: itemX, width: itemW, label} = layout[i]!;
      const isActive = i === this.#selectedIndex;
      const isHovered = i === this.#hoveredIndex;

      const itemColors = resolveColorState(this.#colors, {
        disabled: this.disabled,
        focused: isActive ? this.focused : isHovered,
        active: isActive && !this.focused,
      });

      if (itemColors.bg !== baseColors.bg) {
        buffer.drawRect({
          x: itemX,
          y,
          width: itemW,
          height,
          bgRgba: itemColors.bg,
        });
      }

      const text = ` ${label} `;
      const visibleText = text.slice(0, Math.max(0, itemW));
      buffer.drawText({
        x: itemX,
        y,
        text: visibleText,
        fgRgba: itemColors.fg,
        bgRgba: 0x00_00_00_00,
      });

      if (i < layout.length - 1) {
        const sepX = itemX + itemW;
        const sepFg = this.disabled ? baseColors.fg : this.#colorSeparator;
        buffer.drawText({
          x: sepX,
          y,
          text: '│',
          fgRgba: sepFg,
          bgRgba: 0x00_00_00_00,
        });
      }
    }

    buffer.popClip();
  }

  #effectiveWidth(): number {
    if (this.#rect.width > 0) {
      return this.#rect.width;
    }

    return this.intrinsicSize()?.width ?? 0;
  }

  #computeLayout(): Array<{x: number; width: number; label: string}> {
    const layout: Array<{x: number; width: number; label: string}> = [];
    let currentX = this.#rect.x;
    for (const item of this.#options) {
      const label = String(item);
      const cellWidth = label.length + 2;
      layout.push({x: currentX, width: cellWidth, label});
      currentX += cellWidth + 1;
    }

    return layout;
  }

  #hitTestOption(mouseX: number): number {
    const layout = this.#computeLayout();
    for (const [i, element] of layout.entries()) {
      const {x, width} = element;
      if (mouseX >= x && mouseX < x + width) {
        return i;
      }
    }

    return -1;
  }

  #select(index: number): void {
    if (index === this.#selectedIndex) {
      return;
    }

    this.#selectedIndex = index;
    this.dispatch('change', {value: this.#options[this.#selectedIndex], label: String(this.#options[this.#selectedIndex])});
  }
}

export function createSelectButtonWidget(options?: Partial<SelectButtonWidgetOptions>): SelectButtonWidget {
  return new SelectButtonWidget({...getDefaultSelectButtonOptions(), ...options});
}

export default SelectButtonWidget;
