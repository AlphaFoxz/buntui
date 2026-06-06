import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {BorderSides} from '../../draw_list/types';
import {
  resolveBorderStyle, type TuiBorderStyleName, type TuiWidgetRect, type TuiWidgetSize,
} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {truncateToWidth} from '../../utils/string-width';
import {getTheme} from '../../theme/provider';
import {type ColorScheme, resolveColorState, applyColorSchemeUpdates} from '../color-scheme';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/resolve';
import {
  computeScrollbarGeometry,
  renderScrollbar,
  scrollbarHitTest,
  computeThumbDragOffset, type ScrollbarHitTest,
} from '../scrollbar-helper';
import type {SelectOption, SelectWidgetOptions} from './types';

type SelectColors = {fg: number; bg: number; colorBorder: number};

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
  colorBorderUnfocused: 'border',
  colorBorderFocused: 'borderFocused',
  colorBorderDisabled: 'border',
  borderStyle: 'border.normal',
  colorFgItem: 'text',
  colorBgItem: 'surface',
  colorFgItemSelected: 'accent',
  colorBgItemSelected: 'surfaceFocused',
  colorFgItemHovered: 'text',
  colorBgItemHovered: 'surfaceHover',
} as const;

const DROPDOWN_MAX_VISIBLE = 8;

function getDefaultSelectOptions(): Required<SelectWidgetOptions> & {height: number} {
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
  #previousZIndex = 0;
  #hoveredIndex = -1;
  #focusedIndex = -1;
  #scrollOffset = 0;
  readonly #colorScrollbar: number;
  readonly #colorScrollbarTrack: number;

  #thumbDragging = false;
  #thumbDragStartY = 0;
  #thumbDragStartOffset = 0;

  #dragScrolling = false;
  #dragStartY = 0;
  #dragStartOffset = 0;
  #didDrag = false;
  #justOpened = false;

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

    const theme = getTheme();
    this.#colorScrollbar = parseColor(theme.colors.scrollbar);
    this.#colorScrollbarTrack = parseColor(theme.colors.scrollbarTrack);

    this.#triggerColors = {
      normal: {
        fg: parseColor(resolved.colorFgNormal),
        bg: parseColor(resolved.colorBgNormal),
        colorBorder: parseColor(resolved.colorBorderUnfocused),
      },
      focused: {
        fg: parseColor(resolved.colorFgFocused),
        bg: parseColor(resolved.colorBgFocused),
        colorBorder: parseColor(resolved.colorBorderFocused),
      },
      hovered: {
        fg: parseColor(resolved.colorFgHovered),
        bg: parseColor(resolved.colorBgHovered),
        colorBorder: parseColor(resolved.colorBorderUnfocused),
      },
      disabled: {
        fg: parseColor(resolved.colorFgDisabled),
        bg: parseColor(resolved.colorBgDisabled),
        colorBorder: parseColor(resolved.colorBorderDisabled),
      },
    };

    this.#dropdownColors = {
      item: {fg: parseColor(resolved.colorFgItem), bg: parseColor(resolved.colorBgItem)},
      itemSelected: {fg: parseColor(resolved.colorFgItemSelected), bg: parseColor(resolved.colorBgItemSelected)},
      itemHovered: {fg: parseColor(resolved.colorFgItemHovered), bg: parseColor(resolved.colorBgItemHovered)},
    };

    this.on('mousedown', mouseData => {
      this.#didDrag = false;
      if (this.#opened) {
        const hit = this.#scrollbarHitTest();
        const result = hit ? scrollbarHitTest(mouseData.x, mouseData.y, hit) : {type: 'none'} as const;
        if (result.type === 'thumb') {
          this.#thumbDragging = true;
          this.#thumbDragStartY = mouseData.y;
          this.#thumbDragStartOffset = this.#scrollOffset;
          this.#didDrag = true;
          return;
        }

        if (result.type === 'track-above') {
          this.#scrollBy(-this.#dropdownHeight());
          this.#didDrag = true;
          return;
        }

        if (result.type === 'track-below') {
          this.#scrollBy(this.#dropdownHeight());
          this.#didDrag = true;
          return;
        }

        this.#dragScrolling = true;
        this.#dragStartY = mouseData.y;
        this.#dragStartOffset = this.#scrollOffset;
        this.#hoveredIndex = this.#hitTestDropdown(mouseData.y);
      } else {
        this.#justOpened = true;
        this.#openDropdown();
      }
    });

    this.on('mousemove', mouseData => {
      if (this.#thumbDragging) {
        if ((mouseData.buttons ?? 0) === 0) {
          this.#thumbDragging = false;
          return;
        }

        const delta = mouseData.y - this.#thumbDragStartY;
        const geometry = computeScrollbarGeometry(this.#dropdownHeight(), this.#options.length, this.#thumbDragStartOffset);
        const newOffset = computeThumbDragOffset(delta, this.#thumbDragStartOffset, geometry);
        this.#scrollOffset = Math.max(0, Math.min(newOffset, this.#maxScrollOffset()));
        this.#hoveredIndex = -1;
        return;
      }

      if (this.#dragScrolling) {
        if ((mouseData.buttons ?? 0) === 0) {
          this.#dragScrolling = false;
          return;
        }

        const delta = mouseData.y - this.#dragStartY;
        if (Math.abs(delta) >= 1) {
          this.#didDrag = true;
          this.#scrollOffset = Math.max(0, Math.min(this.#dragStartOffset - delta, this.#maxScrollOffset()));
          this.#hoveredIndex = -1;
        }

        return;
      }

      if (this.#opened) {
        this.#hoveredIndex = this.#hitTestDropdown(mouseData.y);
      }
    });

    this.on('mouseup', mouseData => {
      this.#thumbDragging = false;
      this.#dragScrolling = false;
      if (this.#justOpened) {
        this.#justOpened = false;
        return;
      }

      if (this.#opened && !this.#didDrag) {
        const index = this.#hitTestDropdown(mouseData.y);
        if (index >= 0) {
          this.#select(index);
        }

        this.#close();
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

    this.on('wheel', data => {
      if (this.#opened) {
        this.#scrollBy(data.wheelDeltaY * 3);
      }
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
      return;
    }

    if (event.key === 'ArrowDown') {
      this.#focusedIndex = this.#focusedIndex < 0 ? 0 : (this.#focusedIndex + 1) % this.#options.length;
      this.#ensureFocusedVisible();
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

      this.#ensureFocusedVisible();
      return;
    }

    if (event.key === 'Home') {
      this.#focusedIndex = 0;
      this.#scrollOffset = 0;
      return;
    }

    if (event.key === 'End') {
      this.#focusedIndex = this.#options.length - 1;
      this.#scrollOffset = this.#maxScrollOffset();
      return;
    }

    if (event.key === 'PageDown') {
      if (this.#focusedIndex < 0) {
        this.#focusedIndex = 0;
      }

      this.#focusedIndex = Math.min(this.#focusedIndex + this.#dropdownHeight(), this.#options.length - 1);
      this.#ensureFocusedVisible();
      return;
    }

    if (event.key === 'PageUp') {
      if (this.#focusedIndex < 0) {
        this.#focusedIndex = 0;
      }

      this.#focusedIndex = Math.max(this.#focusedIndex - this.#dropdownHeight(), 0);
      this.#ensureFocusedVisible();
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

    if (this.#scrollOffset > this.#maxScrollOffset()) {
      this.#scrollOffset = this.#maxScrollOffset();
    }
  }

  setPlaceholder(text: string): void {
    this.#placeholder = text;
  }

  setLabel(text: string): void {
    this.#label = text;
    this.#rect.height = text.length > 0 ? Math.max(this.#rect.height, 3) : Math.min(this.#rect.height, 1);
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
        colorRgba: colors.colorBorder,
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
    const needsScrollbar = this.#options.length > ddH;
    const listWidth = needsScrollbar ? width - 1 : width;

    buffer.pushClip(x, startY, width, ddH);

    buffer.drawRect({
      x, y: startY, width, height: ddH, bgRgba: this.#dropdownColors.item.bg,
    });

    const selIdx = this.#selectedIndex();
    const end = Math.min(this.#scrollOffset + ddH, this.#options.length);

    for (let i = this.#scrollOffset; i < end; i++) {
      const option = this.#options[i]!;
      const row = i - this.#scrollOffset;
      const rowY = startY + row;
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
          x, y: rowY, width: listWidth, height: 1, bgRgba: colors.bg,
        });
      }

      const marker = isSelected ? '●' : ' ';
      const maxLabelWidth = listWidth - 4;
      const visibleLabel = maxLabelWidth > 0 ? option.label.slice(0, Math.max(0, maxLabelWidth)) : '';

      buffer.drawText({
        x,
        y: rowY,
        text: ` ${marker} ${visibleLabel}`,
        fgRgba: colors.fg,
        bgRgba: 0x00_00_00_00,
      });
    }

    if (needsScrollbar) {
      const geometry = computeScrollbarGeometry(ddH, this.#options.length, this.#scrollOffset);
      renderScrollbar({
        buffer, x: x + width - 1, trackY: startY, trackHeight: ddH, geometry, thumbColor: this.#colorScrollbar, trackColor: this.#colorScrollbarTrack,
      });
    }

    buffer.popClip();
  }

  #scrollbarHitTest(): ScrollbarHitTest | undefined {
    const ddH = this.#dropdownHeight();
    if (this.#options.length <= ddH) {
      return undefined;
    }

    const geometry = computeScrollbarGeometry(ddH, this.#options.length, this.#scrollOffset);
    return {
      x: this.#rect.x + this.#rect.width - 1,
      trackY: this.#rect.y + this.#rect.height,
      trackHeight: ddH,
      thumbY: this.#rect.y + this.#rect.height + geometry.thumbOffset,
      thumbSize: geometry.thumbSize,
    };
  }

  #dropdownHeight(): number {
    return Math.min(this.#options.length, DROPDOWN_MAX_VISIBLE);
  }

  #maxScrollOffset(): number {
    return Math.max(0, this.#options.length - this.#dropdownHeight());
  }

  #scrollBy(delta: number): void {
    const newOffset = Math.max(0, Math.min(this.#scrollOffset + delta, this.#maxScrollOffset()));
    if (newOffset !== this.#scrollOffset) {
      this.#scrollOffset = newOffset;
      this.#hoveredIndex = -1;
    }
  }

  #ensureFocusedVisible(): void {
    if (this.#focusedIndex < this.#scrollOffset) {
      this.#scrollOffset = this.#focusedIndex;
    } else if (this.#focusedIndex >= this.#scrollOffset + this.#dropdownHeight()) {
      this.#scrollOffset = this.#focusedIndex - this.#dropdownHeight() + 1;
    }
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

    const index = this.#scrollOffset + relativeY;
    if (index >= this.#options.length) {
      return -1;
    }

    return index;
  }

  #openDropdown(): void {
    if (this.#options.length === 0 || this.#opened) {
      return;
    }

    this.#opened = true;
    this.#previousZIndex = this.zIndex;
    this.setPortal(true);
    this.setZIndex(100);
    this.#focusedIndex = this.#selectedIndex();
    if (this.#focusedIndex < 0 && this.#options.length > 0) {
      this.#focusedIndex = 0;
    }

    this.#scrollOffset = Math.max(0, Math.min(this.#focusedIndex, this.#maxScrollOffset()));
    this.dispatch('open', undefined);
  }

  #close(): void {
    if (!this.#opened) {
      return;
    }

    this.#opened = false;
    this.setPortal(false);
    this.setZIndex(this.#previousZIndex);
    this.#hoveredIndex = -1;
    this.#scrollOffset = 0;
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
  const defaults = getDefaultSelectOptions();
  if ((options?.label ?? '').length > 0) {
    defaults.height = 3;
  }

  const widget = new SelectWidget({...defaults, ...options});
  bindThemeToWidget(widget, SELECT_TOKEN_MAP, options ?? {}, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default SelectWidget;
