import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {BorderSides} from '../../draw_list/types';
import {
  resolveBorderStyle, type TuiBorderStyleName, type TuiWidgetRect, type TuiWidgetSize,
} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {stringDisplayWidth, truncateToWidth} from '../../utils/string-width';
import {type ColorScheme, resolveColorState, applyColorSchemeUpdates} from '../color-scheme';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/resolve';
import type {TableColumn, TableRow, TableWidgetOptions} from './types';

type TableColors = {
  fg: number;
  bg: number;
  colorBorder: number;
  colorHeaderFg: number;
  colorHeaderBg: number;
};

const TABLE_TOKEN_MAP = {
  colorFgNormal: 'text',
  colorBgNormal: 'surface',
  colorFgFocused: 'text',
  colorBgFocused: 'surface',
  colorFgDisabled: 'textMuted',
  colorBgDisabled: 'surfaceDisabled',
  colorBorder: 'border',
  borderStyle: 'border.normal',
  colorHeaderFg: 'textMuted',
  colorHeaderBg: 'surface',
  colorSelectionBg: 'selectionBg',
  colorSelectionFg: 'selectionFg',
  colorScrollbar: 'scrollbar',
  colorScrollbarTrack: 'scrollbarTrack',
} as const;

function getDefaultTableOptions(): TableWidgetOptions {
  return {
    x: 0,
    y: 0,
    width: 40,
    height: 10,
    columns: [],
    rows: [],
    disabled: false,

    ...resolveWidgetColors(TABLE_TOKEN_MAP),
  };
}

const DEFAULT_COL_WIDTH = 10;

type ResolvedColumn = {
  key: string;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
};

export class TableWidget extends InteractiveWidget {
  #x: number;
  #y: number;
  #width: number;
  #height: number;

  readonly #colors: ColorScheme<TableColors>;
  #borderStyle: number;
  #colorHeaderFg: number;
  #colorHeaderBg: number;
  #colorSelectionBg: number;
  #colorSelectionFg: number;
  #colorScrollbar: number;
  #colorScrollbarTrack: number;

  #columns: ResolvedColumn[] = [];
  #rows: TableRow[] = [];
  #selectedIndex = -1;
  #scrollOffsetY = 0;

  constructor(options: TableWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultTableOptions(), ...options};
    const rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#x = rect.x;
    this.#y = rect.y;
    this.#width = rect.width;
    this.#height = rect.height;
    this.#colors = {
      normal: {
        fg: parseColor(resolved.colorFgNormal!),
        bg: parseColor(resolved.colorBgNormal!),
        colorBorder: parseColor(resolved.colorBorder!),
        colorHeaderFg: parseColor(resolved.colorHeaderFg!),
        colorHeaderBg: parseColor(resolved.colorHeaderBg!),
      },
      focused: {
        fg: parseColor(resolved.colorFgFocused!),
        bg: parseColor(resolved.colorBgFocused!),
        colorBorder: parseColor(resolved.colorBorder!),
        colorHeaderFg: parseColor(resolved.colorHeaderFg!),
        colorHeaderBg: parseColor(resolved.colorHeaderBg!),
      },
      disabled: {
        fg: parseColor(resolved.colorFgDisabled!),
        bg: parseColor(resolved.colorBgDisabled!),
        colorBorder: parseColor(resolved.colorBorder!),
        colorHeaderFg: parseColor(resolved.colorHeaderFg!),
        colorHeaderBg: parseColor(resolved.colorHeaderBg!),
      },
    };
    this.#borderStyle = resolveBorderStyle(resolved.borderStyle ?? 'solid');
    this.#colorHeaderFg = parseColor(resolved.colorHeaderFg!);
    this.#colorHeaderBg = parseColor(resolved.colorHeaderBg!);
    this.#colorSelectionBg = parseColor(resolved.colorSelectionBg!);
    this.#colorSelectionFg = parseColor(resolved.colorSelectionFg!);
    this.setDisabled(resolved.disabled ?? false);

    this.#colorScrollbar = parseColor(resolved.colorScrollbar!);
    this.#colorScrollbarTrack = parseColor(resolved.colorScrollbarTrack!);

    if (resolved.columns) {
      this.#resolveColumns(resolved.columns);
    }

    this.#rows = resolved.rows ?? [];

    this.on('mousedown', data => {
      if (this.disabled) {
        return;
      }

      const viewport = this.#computeBodyViewport();
      const relY = data.y - viewport.y;
      if (relY < 0 || relY >= viewport.height) {
        return;
      }

      const clickedIndex = this.#scrollOffsetY + relY;
      if (clickedIndex < 0 || clickedIndex >= this.#rows.length) {
        return;
      }

      this.#selectedIndex = clickedIndex;
      this.dispatch('rowSelect', {index: clickedIndex, row: this.#rows[clickedIndex]});
    });

    this.on('wheel', data => {
      this.scrollBy(data.wheelDeltaY * 3);
    });
  }

  get selectedIndex(): number {
    return this.#selectedIndex;
  }

  get selectedRow(): TableRow | undefined {
    return this.#selectedIndex >= 0 ? this.#rows[this.#selectedIndex] : undefined;
  }

  get rows(): TableRow[] {
    return this.#rows;
  }

  get columns(): ResolvedColumn[] {
    return this.#columns;
  }

  setColumns(columns: TableColumn[]): void {
    this.#resolveColumns(columns);
  }

  setRows(rows: TableRow[]): void {
    this.#rows = rows;
    if (this.#selectedIndex >= this.#rows.length) {
      this.#selectedIndex = this.#rows.length - 1;
    }

    this.#clampScrollOffset();
  }

  setOptions(options: {columns?: TableColumn[]; rows?: TableRow[]}): void {
    if (options.columns) {
      this.#resolveColumns(options.columns);
    }

    if (options.rows) {
      this.#rows = options.rows;
      if (this.#selectedIndex >= this.#rows.length) {
        this.#selectedIndex = this.#rows.length - 1;
      }
    }

    this.#clampScrollOffset();
  }

  updateColor(color: {colorFg?: number; colorBg?: number}): void {
    if (color.colorFg !== undefined) {
      const parsed = parseColor(color.colorFg);
      this.#colors.normal.fg = parsed;
      this.#colors.focused!.fg = parsed;
    }

    if (color.colorBg !== undefined) {
      const parsed = parseColor(color.colorBg);
      this.#colors.normal.bg = parsed;
      this.#colors.focused!.bg = parsed;
    }
  }

  updateBorder(border: {borderStyle?: TuiBorderStyleName}): void {
    if (border.borderStyle !== undefined) {
      this.#borderStyle = resolveBorderStyle(border.borderStyle);
    }
  }

  updateThemeColors(resolved: Record<string, unknown>): void {
    applyColorSchemeUpdates(this.#colors, resolved);
    if (resolved.borderStyle !== undefined) {
      this.#borderStyle = resolveBorderStyle(resolved.borderStyle as TuiBorderStyleName);
    }

    if (resolved.colorHeaderFg !== undefined) {
      this.#colorHeaderFg = parseColor(resolved.colorHeaderFg as number);
    }

    if (resolved.colorHeaderBg !== undefined) {
      this.#colorHeaderBg = parseColor(resolved.colorHeaderBg as number);
    }

    if (resolved.colorSelectionBg !== undefined) {
      this.#colorSelectionBg = parseColor(resolved.colorSelectionBg as number);
    }

    if (resolved.colorSelectionFg !== undefined) {
      this.#colorSelectionFg = parseColor(resolved.colorSelectionFg as number);
    }

    if (resolved.colorScrollbar !== undefined) {
      this.#colorScrollbar = parseColor(resolved.colorScrollbar as number);
    }

    if (resolved.colorScrollbarTrack !== undefined) {
      this.#colorScrollbarTrack = parseColor(resolved.colorScrollbarTrack as number);
    }
  }

  override handleActiveKey(event: KeyboardEvent): void {
    const key = event.key!;
    switch (key) {
      case 'ArrowUp': {
        if (this.#selectedIndex > 0) {
          this.#selectedIndex--;
          this.#clampScrollOffset();
          this.dispatch('rowSelect', {index: this.#selectedIndex, row: this.#rows[this.#selectedIndex]});
        }

        break;
      }

      case 'ArrowDown': {
        if (this.#selectedIndex < this.#rows.length - 1) {
          this.#selectedIndex++;
          this.#clampScrollOffset();
          this.dispatch('rowSelect', {index: this.#selectedIndex, row: this.#rows[this.#selectedIndex]});
        }

        break;
      }

      case 'PageUp': {
        const viewport = this.#computeBodyViewport();
        this.#selectedIndex = Math.max(0, this.#selectedIndex - viewport.height);
        this.#clampScrollOffset();
        this.dispatch('rowSelect', {index: this.#selectedIndex, row: this.#rows[this.#selectedIndex]});
        break;
      }

      case 'PageDown': {
        const viewport = this.#computeBodyViewport();
        this.#selectedIndex = Math.min(this.#rows.length - 1, this.#selectedIndex + viewport.height);
        this.#clampScrollOffset();
        this.dispatch('rowSelect', {index: this.#selectedIndex, row: this.#rows[this.#selectedIndex]});
        break;
      }

      case 'Home': {
        this.#selectedIndex = 0;
        this.#clampScrollOffset();
        this.dispatch('rowSelect', {index: this.#selectedIndex, row: this.#rows[this.#selectedIndex]});
        break;
      }

      case 'End': {
        this.#selectedIndex = this.#rows.length - 1;
        this.#clampScrollOffset();
        this.dispatch('rowSelect', {index: this.#selectedIndex, row: this.#rows[this.#selectedIndex]});
        break;
      }

      case 'Enter': {
        if (this.#selectedIndex >= 0) {
          this.dispatch('rowActivate', {index: this.#selectedIndex, row: this.#rows[this.#selectedIndex]});
        }

        break;
      }

      default: {
        break;
      }
    }
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    if (rect.x !== undefined) {
      this.#x = rect.x;
    }

    if (rect.y !== undefined) {
      this.#y = rect.y;
    }

    if (rect.width !== undefined) {
      this.#width = rect.width;
    }

    if (rect.height !== undefined) {
      this.#height = rect.height;
    }
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    if (this.#width <= 0 || this.#height <= 0) {
      return;
    }

    buffer.pushClip(this.#x, this.#y, this.#width, this.#height);

    const colors = resolveColorState(this.#colors, {
      disabled: this.disabled,
      focused: this.focused,
    });

    buffer.drawRect({
      x: this.#x,
      y: this.#y,
      width: this.#width,
      height: this.#height,
      bgRgba: colors.bg,
    });

    const innerX = this.#x + 1;
    const innerY = this.#y + 1;
    const innerWidth = this.#width - 2;
    const innerHeight = this.#height - 2;

    if (innerWidth > 0 && innerHeight > 0) {
      this.#renderHeader(buffer, innerX, innerY, innerWidth);
      this.#renderBody(buffer, innerX, innerY + 1, innerWidth, innerHeight - 1);
    }

    if (this.#borderStyle !== 0) {
      buffer.drawBorder({
        x: this.#x,
        y: this.#y,
        width: this.#width,
        height: this.#height,
        colorRgba: colors.colorBorder,
        style: this.#borderStyle,
        sides: BorderSides.All,
      });
    }

    buffer.popClip();
  }

  override get rect(): TuiWidgetRect {
    return {
      x: this.#x, y: this.#y, width: this.#width, height: this.#height,
    };
  }

  override intrinsicSize(): TuiWidgetSize | undefined {
    return {width: this.#width, height: this.#height};
  }

  scrollTo(offset: number): void {
    const maxScroll = this.#maxScrollOffset();
    this.#scrollOffsetY = Math.max(0, Math.min(offset, maxScroll));
  }

  scrollBy(delta: number): void {
    this.scrollTo(this.#scrollOffsetY + delta);
  }

  #resolveColumns(columns: TableColumn[]): void {
    const availableWidth = this.#width > 0 ? this.#width - 2 : 40;
    const autoCols = columns.filter(c => c.width === undefined);
    const fixedWidth = columns.reduce((sum, c) => sum + (c.width ?? 0), 0);
    const remaining = availableWidth - fixedWidth;
    const autoWidth = autoCols.length > 0 && remaining > 0
      ? Math.floor(remaining / autoCols.length)
      : DEFAULT_COL_WIDTH;

    this.#columns = columns.map(col => ({
      key: col.key,
      label: col.label ?? col.key,
      width: col.width ?? Math.max(autoWidth, DEFAULT_COL_WIDTH),
      align: col.align ?? 'left',
    }));
  }

  #computeBodyViewport(): {x: number; y: number; width: number; height: number} {
    const x = this.#x + 1;
    const y = this.#y + 2;
    const width = Math.max(0, this.#width - 3);
    const height = Math.max(0, this.#height - 3);
    return {
      x, y, width, height,
    };
  }

  #maxScrollOffset(): number {
    const viewport = this.#computeBodyViewport();
    return Math.max(0, this.#rows.length - viewport.height);
  }

  #clampScrollOffset(): void {
    const maxScroll = this.#maxScrollOffset();
    if (this.#scrollOffsetY > maxScroll) {
      this.#scrollOffsetY = maxScroll;
    }

    const viewport = this.#computeBodyViewport();
    if (this.#selectedIndex >= 0 && this.#selectedIndex < this.#rows.length) {
      if (this.#selectedIndex < this.#scrollOffsetY) {
        this.#scrollOffsetY = this.#selectedIndex;
      }

      if (this.#selectedIndex >= this.#scrollOffsetY + viewport.height) {
        this.#scrollOffsetY = this.#selectedIndex - viewport.height + 1;
      }
    }

    this.#scrollOffsetY = Math.max(0, Math.min(this.#scrollOffsetY, maxScroll));
  }

  #renderHeader(buffer: DrawListBuffer, x: number, y: number, width: number): void {
    buffer.pushClip(x, y, width, 1);
    let drawX = x;
    for (const col of this.#columns) {
      if (drawX >= x + width) {
        break;
      }

      const cellWidth = Math.min(col.width, x + width - drawX);
      const text = this.#alignText(truncateToWidth(col.label, cellWidth - 1), cellWidth - 1, 'left');
      buffer.drawText({
        x: drawX,
        y,
        text,
        fgRgba: this.#colorHeaderFg,
        bgRgba: this.#colorHeaderBg,
      });
      drawX += col.width;
    }

    buffer.popClip();
  }

  #renderBody(buffer: DrawListBuffer, x: number, y: number, width: number, height: number): void {
    if (height <= 0) {
      return;
    }

    buffer.pushClip(x, y, width, height);

    const colors = resolveColorState(this.#colors, {
      disabled: this.disabled,
      focused: this.focused,
    });

    for (let i = 0; i < height; i++) {
      const rowIndex = this.#scrollOffsetY + i;
      if (rowIndex >= this.#rows.length) {
        break;
      }

      const row = this.#rows[rowIndex]!;
      const screenY = y + i;
      const isSelected = rowIndex === this.#selectedIndex;

      let drawX = x;
      for (const col of this.#columns) {
        if (drawX >= x + width) {
          break;
        }

        const cellWidth = Math.min(col.width, x + width - drawX);
        const rawValue = row[col.key];
        const cellValue = typeof rawValue === 'string' ? rawValue : (rawValue as number | boolean | undefined)?.toString() ?? '';
        const cellText = this.#alignText(truncateToWidth(cellValue, cellWidth - 1), cellWidth - 1, col.align);
        buffer.drawText({
          x: drawX,
          y: screenY,
          text: cellText,
          fgRgba: isSelected ? this.#colorSelectionFg : colors.fg,
          bgRgba: isSelected ? this.#colorSelectionBg : 0x00_00_00_00,
        });
        drawX += col.width;
      }
    }

    buffer.popClip();

    this.#renderScrollbar(buffer, x + width, y, height);
  }

  #alignText(text: string, width: number, align: 'left' | 'center' | 'right'): string {
    const textWidth = stringDisplayWidth(text);
    if (textWidth >= width) {
      return text;
    }

    const padding = width - textWidth;
    if (align === 'right') {
      return ' '.repeat(padding) + text + ' ';
    }

    if (align === 'center') {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad + 1);
    }

    return text + ' '.repeat(padding + 1);
  }

  #renderScrollbar(buffer: DrawListBuffer, x: number, y: number, height: number): void {
    const maxScroll = this.#maxScrollOffset();
    if (maxScroll === 0) {
      return;
    }

    const totalRows = this.#rows.length;
    if (totalRows <= 0) {
      return;
    }

    const thumbRatio = height / totalRows;
    const thumbSize = Math.max(1, Math.round(thumbRatio * height));
    const scrollableRange = height - thumbSize;
    const thumbOffset = maxScroll > 0
      ? Math.round((this.#scrollOffsetY / maxScroll) * scrollableRange)
      : 0;

    for (let row = 0; row < height; row++) {
      const isThumb = row >= thumbOffset && row < thumbOffset + thumbSize;
      buffer.drawChar({
        x,
        y: y + row,
        char: isThumb ? 0x25_88 : 0x25_02,
        fgRgba: isThumb ? this.#colorScrollbar : this.#colorScrollbarTrack,
        bgRgba: 0x00_00_00_00,
      });
    }
  }
}

export function createTableWidget(options?: Partial<TableWidgetOptions>): TableWidget {
  const widget = new TableWidget({...getDefaultTableOptions(), ...options});
  bindThemeToWidget(widget, TABLE_TOKEN_MAP, options ?? {}, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default TableWidget;
