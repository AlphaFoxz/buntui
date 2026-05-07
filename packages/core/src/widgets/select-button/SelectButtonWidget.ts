import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {extractPercentSpec, isPercent} from '../../utils/percent';
import type {SelectButtonWidgetOptions} from './types';

const DEFAULT_SELECT_BUTTON_OPTIONS = {
  x: 0,
  y: 0,
  width: 0,
  height: 1,
  options: [] as unknown[],
  value: undefined as unknown,
  disabled: false,

  colorFgNormal: 0x6C_70_86_FF,
  colorBgNormal: 0x1E_1E_2E_FF,

  colorFgActive: 0xFF_FF_FF_FF,
  colorBgActive: 0x31_32_44_FF,

  colorFgFocused: 0x89_B4_FA_FF,
  colorBgFocused: 0x45_47_5A_FF,

  colorFgDisabled: 0x6C_70_86_FF,
  colorBgDisabled: 0x18_18_25_FF,

  colorFgSeparator: 0x45_47_5A_FF,
};

export class SelectButtonWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #options: unknown[];
  #selectedIndex: number;
  #hoveredIndex = -1;

  readonly #colorFgNormal: number;
  readonly #colorBgNormal: number;
  readonly #colorFgActive: number;
  readonly #colorBgActive: number;
  readonly #colorFgFocused: number;
  readonly #colorBgFocused: number;
  readonly #colorFgDisabled: number;
  readonly #colorBgDisabled: number;
  readonly #colorFgSeparator: number;

  constructor(options: SelectButtonWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_SELECT_BUTTON_OPTIONS, ...options};
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
    this.setDisabled(resolved.disabled);

    if (resolved.value === undefined) {
      this.#selectedIndex = this.#options.length > 0 ? 0 : -1;
    } else {
      this.#selectedIndex = this.#options.indexOf(resolved.value);
    }

    this.#colorFgNormal = parseColor(resolved.colorFgNormal);
    this.#colorBgNormal = parseColor(resolved.colorBgNormal);
    this.#colorFgActive = parseColor(resolved.colorFgActive);
    this.#colorBgActive = parseColor(resolved.colorBgActive);
    this.#colorFgFocused = parseColor(resolved.colorFgFocused);
    this.#colorBgFocused = parseColor(resolved.colorBgFocused);
    this.#colorFgDisabled = parseColor(resolved.colorFgDisabled);
    this.#colorBgDisabled = parseColor(resolved.colorBgDisabled);
    this.#colorFgSeparator = parseColor(resolved.colorFgSeparator);

    this.on('mousedown', mouseData => {
      if (this.disabled) {
        return;
      }

      const index = this.#hitTestOption(mouseData.x);
      if (index >= 0) {
        this.#select(index);
      }
    });

    this.on('mousemove', mouseData => {
      if (this.disabled) {
        return;
      }

      this.#hoveredIndex = this.#hitTestOption(mouseData.x);
    });

    this.on('mouseover', mouseData => {
      if (this.disabled) {
        return;
      }

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

  handleKey(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }

    if (event.key === undefined) {
      return;
    }

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

    const baseBg = this.disabled ? this.#colorBgDisabled : this.#colorBgNormal;
    buffer.drawRect({
      x,
      y,
      width: w,
      height,
      bgRgba: baseBg,
    });

    const layout = this.#computeLayout();

    for (let i = 0; i < layout.length; i++) {
      const {x: itemX, width: itemW, label} = layout[i]!;
      const isActive = i === this.#selectedIndex;
      const isHovered = i === this.#hoveredIndex;

      if (isActive) {
        const bg = this.disabled
          ? this.#colorBgDisabled
          : (this.focused ? this.#colorBgFocused : this.#colorBgActive);
        buffer.drawRect({
          x: itemX,
          y,
          width: itemW,
          height,
          bgRgba: bg,
        });
      } else if (isHovered && !this.disabled) {
        buffer.drawRect({
          x: itemX,
          y,
          width: itemW,
          height,
          bgRgba: this.#colorBgFocused,
        });
      }

      let fg: number;
      if (this.disabled) {
        fg = this.#colorFgDisabled;
      } else if (isActive) {
        fg = this.focused ? this.#colorFgFocused : this.#colorFgActive;
      } else {
        fg = isHovered ? this.#colorFgFocused : this.#colorFgNormal;
      }

      const text = ` ${label} `;
      const visibleText = text.slice(0, Math.max(0, itemW));
      buffer.drawText({
        x: itemX,
        y,
        text: visibleText,
        fgRgba: fg,
        bgRgba: 0x00_00_00_00,
      });

      if (i < layout.length - 1) {
        const sepX = itemX + itemW;
        const sepFg = this.disabled ? this.#colorFgDisabled : this.#colorFgSeparator;
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
  return new SelectButtonWidget({...DEFAULT_SELECT_BUTTON_OPTIONS, ...options});
}

export default SelectButtonWidget;
