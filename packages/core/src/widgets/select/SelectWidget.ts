import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {BorderSides} from '../../draw_list/types';
import {
  resolveBorderStyle, type TuiBorderStyleName, type TuiWidgetRect, type TuiWidgetSize,
} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {truncateToWidth} from '../../utils/string-width';
import {type ColorScheme, resolveColorState, applyColorSchemeUpdates} from '../color-scheme';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/resolve';
import type {SelectOption, SelectWidgetOptions} from './types';

type SelectColors = {fg: number; bg: number; borderColor: number};

type DropdownColors = {
  item: {fg: number; bg: number};
  itemSelected: {fg: number; bg: number};
  itemHovered: {fg: number; bg: number};
};

const SELECT_TOKEN_MAP = {
  colorFgNormal: 'textMuted',
  colorBgNormal: 'surface',
  colorFgFocused: 'text',
  colorBgFocused: 'surfaceFocused',
  colorFgHovered: 'text',
  colorBgHovered: 'surfaceHover',
  colorFgDisabled: 'textMuted',
  colorBgDisabled: 'surfaceDisabled',
  borderColorUnfocused: 'border',
  borderColorFocused: 'borderFocused',
  borderColorDisabled: 'border',
  borderStyle: 'border.normal',
  colorFgItem: 'text',
  colorBgItem: 'surface',
  colorFgItemSelected: 'accent',
  colorBgItemSelected: 'surfaceFocused',
  colorFgItemHovered: 'text',
  colorBgItemHovered: 'surfaceHover',
} as const;

const DROPDOWN_MAX_VISIBLE = 8;

function getDefaultSelectOptions(): Required<SelectWidgetOptions> {
  return {
    x: 0,
    y: 0,
    width: 20,
    height: 1,
    options: [],
    value: '',
    placeholder: '',
    label: '',
    disabled: false,

    ...resolveWidgetColors(SELECT_TOKEN_MAP),
  };
}

export class SelectWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #options: SelectOption[];
  #value: string;
  #placeholder: string;
  #label: string;
  #borderStyle: number;
  #opened = false;
  #hoveredIndex = -1;
  #focusedIndex = -1;

  readonly #triggerColors: ColorScheme<SelectColors>;
  readonly #dropdownColors: DropdownColors;

  constructor(options: SelectWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultSelectOptions(), ...options};
    this.#rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#options = resolved.options;
    this.#value = resolved.value;
    this.#placeholder = resolved.placeholder;
    this.#label = resolved.label;
    this.#borderStyle = resolveBorderStyle(resolved.borderStyle);
    this.setDisabled(resolved.disabled);

    this.#triggerColors = {
      normal: {
        fg: parseColor(resolved.colorFgNormal),
        bg: parseColor(resolved.colorBgNormal),
        borderColor: parseColor(resolved.borderColorUnfocused),
      },
      focused: {
        fg: parseColor(resolved.colorFgFocused),
        bg: parseColor(resolved.colorBgFocused),
        borderColor: parseColor(resolved.borderColorFocused),
      },
      hovered: {
        fg: parseColor(resolved.colorFgHovered),
        bg: parseColor(resolved.colorBgHovered),
        borderColor: parseColor(resolved.borderColorUnfocused),
      },
      disabled: {
        fg: parseColor(resolved.colorFgDisabled),
        bg: parseColor(resolved.colorBgDisabled),
        borderColor: parseColor(resolved.borderColorDisabled),
      },
    };

    this.#dropdownColors = {
      item: {fg: parseColor(resolved.colorFgItem), bg: parseColor(resolved.colorBgItem)},
      itemSelected: {fg: parseColor(resolved.colorFgItemSelected), bg: parseColor(resolved.colorBgItemSelected)},
      itemHovered: {fg: parseColor(resolved.colorFgItemHovered), bg: parseColor(resolved.colorBgItemHovered)},
    };

    this.on('mousedown', mouseData => {
      if (this.#opened) {
        const index = this.#hitTestDropdown(mouseData.y);
        if (index >= 0) {
          this.#select(index);
        }

        this.#close();
      } else {
        this.#openDropdown();
      }
    });

    this.on('mousemove', mouseData => {
      if (this.#opened) {
        this.#hoveredIndex = this.#hitTestDropdown(mouseData.y);
      }
    });

    this.on('mouseover', mouseData => {
      if (this.#opened) {
        this.#hoveredIndex = this.#hitTestDropdown(mouseData.y);
      }
    });

    this.on('mouseout', () => {
      this.#hoveredIndex = -1;
    });
  }

  override blur(): void {
    if (this.#opened) {
      this.#close();
    }

    super.blur();
  }

  override handleActiveKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      if (this.#opened) {
        if (this.#focusedIndex >= 0 && this.#focusedIndex < this.#options.length) {
          this.#select(this.#focusedIndex);
        }

        this.#close();
      } else {
        this.#openDropdown();
      }

      return;
    }

    if (event.key === 'Escape') {
      if (this.#opened) {
        this.#close();
      }

      return;
    }

    if (!this.#opened) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        this.#openDropdown();
        if (this.#focusedIndex < 0 && this.#options.length > 0) {
          this.#focusedIndex = this.#selectedIndex();
        }

        return;
      }

      return;
    }

    if (event.key === 'ArrowDown') {
      this.#focusedIndex = this.#focusedIndex < 0 ? 0 : (this.#focusedIndex + 1) % this.#options.length;

      return;
    }

    if (event.key === 'ArrowUp') {
      if (this.#focusedIndex < 0) {
        this.#focusedIndex = this.#options.length - 1;
      } else if (this.#focusedIndex <= 0) {
        this.#focusedIndex = this.#options.length - 1;
      } else {
        this.#focusedIndex--;
      }

      return;
    }

    if (event.key === 'Home') {
      this.#focusedIndex = 0;
      return;
    }

    if (event.key === 'End') {
      this.#focusedIndex = this.#options.length - 1;
    }
  }

  get value(): string {
    return this.#value;
  }

  get selectedIndex(): number {
    return this.#selectedIndex();
  }

  get selectedLabel(): string {
    const index = this.#selectedIndex();
    if (index < 0) {
      return '';
    }

    return this.#options[index]?.label ?? '';
  }

  get open(): boolean {
    return this.#opened;
  }

  updateValue(value: string): void {
    this.#value = value;
    if (this.#focusedIndex >= 0 && this.#options[this.#focusedIndex]?.value !== value) {
      this.#focusedIndex = this.#selectedIndex();
    }
  }

  get options(): SelectOption[] {
    return this.#options;
  }

  setOptions(options: SelectOption[]): void {
    this.#options = options;
    this.#focusedIndex = this.#selectedIndex();
    if (this.#hoveredIndex >= options.length) {
      this.#hoveredIndex = -1;
    }
  }

  setPlaceholder(text: string): void {
    this.#placeholder = text;
  }

  setLabel(text: string): void {
    this.#label = text;
  }

  updateBorder(border: {borderStyle?: TuiBorderStyleName}): void {
    if (border.borderStyle !== undefined) {
      this.#borderStyle = resolveBorderStyle(border.borderStyle);
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

  override get zIndex(): number {
    return this.#opened ? 999 : 0;
  }

  override containsPoint(x: number, y: number): boolean {
    const {x: rx, y: ry, width: rw, height: rh} = this.#rect;
    if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) {
      return true;
    }

    if (this.#opened) {
      const ddY = ry + rh;
      const ddH = this.#dropdownHeight();
      return x >= rx && x < rx + rw && y >= ddY && y < ddY + ddH;
    }

    return false;
  }

  updateThemeColors(resolved: Record<string, unknown>): void {
    applyColorSchemeUpdates(this.#triggerColors, resolved);

    if (resolved.borderStyle !== undefined) {
      this.#borderStyle = resolveBorderStyle(resolved.borderStyle as TuiBorderStyleName);
    }

    if (resolved.colorFgItem !== undefined) {
      this.#dropdownColors.item.fg = parseColor(resolved.colorFgItem as number);
    }

    if (resolved.colorBgItem !== undefined) {
      this.#dropdownColors.item.bg = parseColor(resolved.colorBgItem as number);
    }

    if (resolved.colorFgItemSelected !== undefined) {
      this.#dropdownColors.itemSelected.fg = parseColor(resolved.colorFgItemSelected as number);
    }

    if (resolved.colorBgItemSelected !== undefined) {
      this.#dropdownColors.itemSelected.bg = parseColor(resolved.colorBgItemSelected as number);
    }

    if (resolved.colorFgItemHovered !== undefined) {
      this.#dropdownColors.itemHovered.fg = parseColor(resolved.colorFgItemHovered as number);
    }

    if (resolved.colorBgItemHovered !== undefined) {
      this.#dropdownColors.itemHovered.bg = parseColor(resolved.colorBgItemHovered as number);
    }
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const {x, y, width, height} = this.#rect;
    if (width <= 0 || height <= 0) {
      return;
    }

    this.#drawTrigger(buffer, x, y, width, height);

    if (this.#opened && this.#options.length > 0) {
      this.#drawDropdown(buffer, x, y + height, width);
    }
  }

  #drawTrigger(buffer: DrawListBuffer, x: number, y: number, width: number, height: number): void {
    buffer.pushClip(x, y, width, height);

    const colors = resolveColorState(this.#triggerColors, {
      disabled: this.disabled,
      focused: this.focused && !this.#opened,
      hovered: this.hovered && !this.#opened,
    });

    buffer.drawRect({
      x, y, width, height, bgRgba: colors.bg,
    });

    const indicator = this.#opened ? ' ▴' : ' ▾';
    const innerWidth = width - 2;
    const maxLabelWidth = innerWidth - indicator.length - 1;
    const label = this.#selectedLabel() || this.#placeholder;
    const visibleLabel = maxLabelWidth > 0 ? label.slice(0, Math.max(0, maxLabelWidth)) : '';
    const textY = y + Math.floor(height / 2);

    buffer.drawText({
      x: x + 1,
      y: textY,
      text: ` ${visibleLabel}`,
      fgRgba: colors.fg,
      bgRgba: 0x00_00_00_00,
    });

    buffer.drawText({
      x: x + width - indicator.length - 1,
      y: textY,
      text: indicator,
      fgRgba: colors.fg,
      bgRgba: 0x00_00_00_00,
    });

    buffer.popClip();

    if (this.#borderStyle !== 0) {
      buffer.drawBorder({
        x,
        y,
        width,
        height,
        colorRgba: colors.borderColor,
        style: this.#borderStyle,
        sides: BorderSides.All,
      });

      if (this.#label.length > 0) {
        const maxLabelWidth = width - 2;
        const clippedLabel = truncateToWidth(this.#label, maxLabelWidth);
        buffer.drawText({
          x: x + 1,
          y,
          text: clippedLabel,
          fgRgba: colors.fg,
          bgRgba: colors.bg,
        });
      }
    }
  }

  #drawDropdown(buffer: DrawListBuffer, x: number, startY: number, width: number): void {
    const ddH = this.#dropdownHeight();
    buffer.pushClip(x, startY, width, ddH);

    buffer.drawRect({
      x, y: startY, width, height: ddH, bgRgba: this.#dropdownColors.item.bg,
    });

    const visibleCount = Math.min(this.#options.length, DROPDOWN_MAX_VISIBLE);
    const selIdx = this.#selectedIndex();

    for (let i = 0; i < visibleCount; i++) {
      const option = this.#options[i]!;
      const rowY = startY + i;
      const isSelected = i === selIdx;
      const isHovered = i === this.#hoveredIndex;
      const isFocused = i === this.#focusedIndex;

      let colors: {fg: number; bg: number} = this.#dropdownColors.item;
      if (isSelected) {
        colors = this.#dropdownColors.itemSelected;
      }

      if (isHovered || isFocused) {
        colors = this.#dropdownColors.itemHovered;
      }

      if (colors.bg !== 0x00_00_00_00) {
        buffer.drawRect({
          x, y: rowY, width, height: 1, bgRgba: colors.bg,
        });
      }

      const marker = isSelected ? '●' : ' ';
      const maxLabelWidth = width - 4;
      const visibleLabel = maxLabelWidth > 0 ? option.label.slice(0, Math.max(0, maxLabelWidth)) : '';

      buffer.drawText({
        x,
        y: rowY,
        text: ` ${marker} ${visibleLabel}`,
        fgRgba: colors.fg,
        bgRgba: 0x00_00_00_00,
      });
    }

    buffer.popClip();
  }

  #dropdownHeight(): number {
    return Math.min(this.#options.length, DROPDOWN_MAX_VISIBLE);
  }

  #selectedIndex(): number {
    if (this.#value === '') {
      return -1;
    }

    return this.#options.findIndex(option => option.value === this.#value);
  }

  #selectedLabel(): string {
    const index = this.#selectedIndex();
    if (index < 0) {
      return '';
    }

    return this.#options[index]?.label ?? '';
  }

  #hitTestDropdown(mouseY: number): number {
    const ddY = this.#rect.y + this.#rect.height;
    const relativeY = mouseY - ddY;
    if (relativeY < 0 || relativeY >= this.#dropdownHeight()) {
      return -1;
    }

    return relativeY;
  }

  #openDropdown(): void {
    if (this.#options.length === 0) {
      return;
    }

    this.#opened = true;
    this.#focusedIndex = this.#selectedIndex();
    if (this.#focusedIndex < 0 && this.#options.length > 0) {
      this.#focusedIndex = 0;
    }

    this.dispatch('open', undefined);
  }

  #close(): void {
    this.#opened = false;
    this.#hoveredIndex = -1;
    this.dispatch('close', undefined);
  }

  #select(index: number): void {
    if (index < 0 || index >= this.#options.length) {
      return;
    }

    const option = this.#options[index]!;
    this.#value = option.value;
    this.#focusedIndex = index;
    this.dispatch('change', {value: option.value, label: option.label});
  }
}

export function createSelectWidget(options?: Partial<SelectWidgetOptions>): SelectWidget {
  const widget = new SelectWidget({...getDefaultSelectOptions(), ...options});
  bindThemeToWidget(widget, SELECT_TOKEN_MAP, options ?? {}, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default SelectWidget;
