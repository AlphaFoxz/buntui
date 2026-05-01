import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent, type MouseEvent} from '../../events/types';
import type {TuiWidgetRect} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {Focusable} from '../Focusable';
import type {TabBarWidgetOptions} from './types';

const DEFAULT_TAB_BAR_OPTIONS: Required<TabBarWidgetOptions> = {
  rectX: 0,
  rectY: 0,
  rectWidth: 40,
  rectHeight: 1,
  tabs: [],
  value: 0,
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

export class TabBarWidget extends TuiWidgetEntity implements Focusable {
  #rectX: number;
  #rectY: number;
  #rectWidth: number;
  #rectHeight: number;
  #tabs: string[];
  #value: number;
  #hoveredIndex = -1;
  #focused = false;
  #disabled: boolean;

  readonly #colorFgNormal: number;
  readonly #colorBgNormal: number;
  readonly #colorFgActive: number;
  readonly #colorBgActive: number;
  readonly #colorFgFocused: number;
  readonly #colorBgFocused: number;
  readonly #colorFgDisabled: number;
  readonly #colorBgDisabled: number;
  readonly #colorFgSeparator: number;

  constructor(options: TabBarWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_TAB_BAR_OPTIONS, ...options};

    this.#rectX = resolved.rectX;
    this.#rectY = resolved.rectY;
    this.#rectWidth = resolved.rectWidth;
    this.#rectHeight = resolved.rectHeight;
    this.#tabs = resolved.tabs;
    this.#value = resolved.value;
    this.#disabled = resolved.disabled;

    this.#colorFgNormal = resolved.colorFgNormal;
    this.#colorBgNormal = resolved.colorBgNormal;
    this.#colorFgActive = resolved.colorFgActive;
    this.#colorBgActive = resolved.colorBgActive;
    this.#colorFgFocused = resolved.colorFgFocused;
    this.#colorBgFocused = resolved.colorBgFocused;
    this.#colorFgDisabled = resolved.colorFgDisabled;
    this.#colorBgDisabled = resolved.colorBgDisabled;
    this.#colorFgSeparator = resolved.colorFgSeparator;

    this.on('mousedown', (data: unknown) => {
      if (this.#disabled) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const mouseData = data as MouseEvent;
      const index = this.#hitTestTab(mouseData.x);
      if (index >= 0) {
        this.#select(index);
      }
    });

    this.on('mousemove', (data: unknown) => {
      if (this.#disabled) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const mouseData = data as MouseEvent;
      this.#hoveredIndex = this.#hitTestTab(mouseData.x);
    });

    this.on('mouseover', (data: unknown) => {
      if (this.#disabled) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const mouseData = data as MouseEvent;
      this.#hoveredIndex = this.#hitTestTab(mouseData.x);
    });

    this.on('mouseout', () => {
      this.#hoveredIndex = -1;
    });
  }

  get acceptsFocus(): boolean {
    return !this.#disabled;
  }

  focus(): void {
    this.#focused = true;
    this.dispatch('focus', undefined);
  }

  blur(): void {
    this.#focused = false;
    this.#hoveredIndex = -1;
    this.dispatch('blur', undefined);
  }

  handleKey(event: KeyboardEvent): void {
    if (this.#disabled) {
      return;
    }

    if (event.key === undefined) {
      return;
    }

    if (this.#tabs.length === 0) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      const newValue = (this.#value - 1 + this.#tabs.length) % this.#tabs.length;
      this.#select(newValue);
      return;
    }

    if (event.key === 'ArrowRight') {
      const newValue = (this.#value + 1) % this.#tabs.length;
      this.#select(newValue);
      return;
    }
  }

  get value(): number {
    return this.#value;
  }

  get activeLabel(): string {
    if (this.#value < 0 || this.#value >= this.#tabs.length) {
      return '';
    }

    return this.#tabs[this.#value] ?? '';
  }

  setValue(index: number): void {
    this.#value = index;
  }

  get tabs(): string[] {
    return this.#tabs;
  }

  setTabs(tabs: string[]): void {
    this.#tabs = tabs;
    if (this.#value >= tabs.length) {
      this.#value = Math.max(0, tabs.length - 1);
    }
  }

  get disabled(): boolean {
    return this.#disabled;
  }

  setDisabled(value: boolean): void {
    this.#disabled = value;
  }

  override get rect(): TuiWidgetRect {
    return {
      rectX: this.#rectX,
      rectY: this.#rectY,
      rectWidth: this.#rectWidth,
      rectHeight: this.#rectHeight,
    };
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    if (rect.rectX !== undefined) {
      this.#rectX = rect.rectX;
    }

    if (rect.rectY !== undefined) {
      this.#rectY = rect.rectY;
    }

    if (rect.rectWidth !== undefined) {
      this.#rectWidth = rect.rectWidth;
    }

    if (rect.rectHeight !== undefined) {
      this.#rectHeight = rect.rectHeight;
    }
  }

  override containsPoint(x: number, y: number): boolean {
    return x >= this.#rectX
      && x < this.#rectX + this.#rectWidth
      && y >= this.#rectY
      && y < this.#rectY + this.#rectHeight;
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    if (this.#rectWidth <= 0 || this.#rectHeight <= 0 || this.#tabs.length === 0) {
      return;
    }

    buffer.pushClip(this.#rectX, this.#rectY, this.#rectWidth, this.#rectHeight);

    const baseBg = this.#disabled ? this.#colorBgDisabled : this.#colorBgNormal;
    buffer.drawRect({
      x: this.#rectX,
      y: this.#rectY,
      width: this.#rectWidth,
      height: this.#rectHeight,
      bgRgba: baseBg,
    });

    const layout = this.#computeTabLayout();

    for (let i = 0; i < layout.length; i++) {
      const {x, width, label} = layout[i]!;
      const isActive = i === this.#value;
      const isHovered = i === this.#hoveredIndex;

      if (isActive) {
        const bg = this.#disabled
          ? this.#colorBgDisabled
          : (this.#focused ? this.#colorBgFocused : this.#colorBgActive);
        buffer.drawRect({
          x,
          y: this.#rectY,
          width,
          height: this.#rectHeight,
          bgRgba: bg,
        });
      } else if (isHovered && !this.#disabled) {
        buffer.drawRect({
          x,
          y: this.#rectY,
          width,
          height: this.#rectHeight,
          bgRgba: this.#colorBgFocused,
        });
      }

      const fg = this.#disabled
        ? this.#colorFgDisabled
        : (isActive
          ? (this.#focused ? this.#colorFgFocused : this.#colorFgActive)
          : (isHovered ? this.#colorFgFocused : this.#colorFgNormal));

      const text = ` ${label} `;
      const visibleText = text.slice(0, Math.max(0, width));
      buffer.drawText({
        x,
        y: this.#rectY,
        text: visibleText,
        fgRgba: fg,
        bgRgba: 0x00_00_00_00,
      });

      if (i < layout.length - 1) {
        const sepX = x + width;
        const sepFg = this.#disabled ? this.#colorFgDisabled : this.#colorFgSeparator;
        buffer.drawText({
          x: sepX,
          y: this.#rectY,
          text: '│',
          fgRgba: sepFg,
          bgRgba: 0x00_00_00_00,
        });
      }
    }

    buffer.popClip();
  }

  override unmounted(): void {
    if (this.#focused) {
      this.blur();
    }

    super.unmounted();
  }

  #computeTabLayout(): Array<{x: number; width: number; label: string}> {
    const layout: Array<{x: number; width: number; label: string}> = [];
    let currentX = this.#rectX;
    for (let i = 0; i < this.#tabs.length; i++) {
      const label = this.#tabs[i]!;
      const cellWidth = label.length + 2;
      layout.push({x: currentX, width: cellWidth, label});
      currentX += cellWidth + 1;
    }

    return layout;
  }

  #hitTestTab(mouseX: number): number {
    const layout = this.#computeTabLayout();
    for (let i = 0; i < layout.length; i++) {
      const {x, width} = layout[i]!;
      if (mouseX >= x && mouseX < x + width) {
        return i;
      }
    }

    return -1;
  }

  #select(index: number): void {
    if (index === this.#value) {
      return;
    }

    this.#value = index;
    this.dispatch('change', {value: this.#value, label: this.#tabs[this.#value] ?? ''});
  }
}

export function createTabBarWidget(options?: Partial<TabBarWidgetOptions>): TabBarWidget {
  return new TabBarWidget({...DEFAULT_TAB_BAR_OPTIONS, ...options});
}

export default TabBarWidget;
