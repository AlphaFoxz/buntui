import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent, type MouseEvent} from '../../events/types';
import {BorderSides, resolveCursorMode, type CursorModeName} from '../../draw_list/types';
import {
  resolveBorderStyle, type TuiBorderStyleName, type TuiWidgetRect, type TuiWidgetSize,
} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import {parseColor} from '../../utils/color';
import {charDisplayWidth, stringDisplayWidth, truncateToWidth} from '../../utils/string-width';
import {type ColorScheme, resolveColorState, applyColorSchemeUpdates} from '../color-scheme';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/resolve';
import {getClipboard} from '../../clipboard';
import type {TextareaWidgetOptions} from './types';

type TextareaColors = {fg: number; bg: number; colorBorder: number};

function charIndexAtColumn(text: string, column: number): number {
  let width = 0;
  let index = 0;
  for (const char of text) {
    const cw = charDisplayWidth(char);
    if (width + cw > column) {
      break;
    }

    width += cw;
    index++;
  }

  return index;
}

const CHAR_CATEGORY_WORD = 0;
const CHAR_CATEGORY_SPACE = 1;
const CHAR_CATEGORY_PUNCT = 2;
const CHAR_CATEGORY_CJK = 3;

function charCategory(code: number): number {
  if (code <= 0x20) {
    return CHAR_CATEGORY_SPACE;
  }

  if ((code >= 0x4E_00 && code <= 0x9F_FF) || (code >= 0x34_00 && code <= 0x4D_BF) || (code >= 0x30_00 && code <= 0x30_3F) || (code >= 0xFF_00 && code <= 0xFF_EF)) {
    return CHAR_CATEGORY_CJK;
  }

  if ((code >= 0x21 && code <= 0x2F) || (code >= 0x3A && code <= 0x40) || (code >= 0x5B && code <= 0x60) || (code >= 0x7B && code <= 0x7E)) {
    return CHAR_CATEGORY_PUNCT;
  }

  return CHAR_CATEGORY_WORD;
}

const TEXTAREA_TOKEN_MAP = {
  colorFgNormal: 'text',
  colorBgNormal: 'surface',
  colorFgFocused: 'text',
  colorBgFocused: 'surface',
  colorBorderUnfocused: 'border',
  colorBorderFocused: 'borderFocused',
  colorBorderDisabled: 'border',
  borderStyle: 'border.normal',
  colorPlaceholder: 'placeholder',
  colorSelectionBg: 'selectionBg',
  colorSelectionFg: 'selectionFg',
  colorFgDisabled: 'textMuted',
  colorBgDisabled: 'surfaceDisabled',
  colorScrollbar: 'scrollbar',
  colorScrollbarTrack: 'scrollbarTrack',
} as const;

function getDefaultTextareaOptions(): TextareaWidgetOptions {
  return {
    x: 0,
    y: 0,
    width: 40,
    height: 10,
    placeholder: '',
    value: '',
    maxLength: 0,
    label: '',
    readonly: false,
    disabled: false,

    ...resolveWidgetColors(TEXTAREA_TOKEN_MAP),
  };
}

type TextPosition = {
  line: number;
  col: number;
};

type VisualLine = {
  text: string;
  logicalLine: number;
  startCol: number;
  charCount: number;
};

export class TextareaWidget extends InteractiveWidget {
  #x: number;
  #y: number;
  #width: number;
  #height: number;

  readonly #colors: ColorScheme<TextareaColors>;
  #borderStyle: number;
  #maxLength: number;
  #placeholder: string;
  #colorPlaceholder: number;
  #colorSelectionBg: number;
  #colorSelectionFg: number;
  #label: string;
  #isReadonly: boolean;
  #colorScrollbar: number;
  #colorScrollbarTrack: number;

  #value: string;
  #logicalLines: string[] = [];
  #visualLines: VisualLine[] = [];
  #cursorLine = 0;
  #cursorCol = 0;
  #scrollOffsetY = 0;
  #selectionAnchor: TextPosition | undefined;
  #isSelecting = false;
  #clickCount = 0;
  #lastClickTime = 0;
  #lastClickPos: TextPosition = {line: -1, col: -1};
  #cursorMode: CursorModeName = 'blinking-ibeam';
  readonly #undoStack: Array<{value: string; cursorLine: number; cursorCol: number; selectionAnchor: TextPosition | undefined}> = [];
  readonly #redoStack: Array<{value: string; cursorLine: number; cursorCol: number; selectionAnchor: TextPosition | undefined}> = [];

  constructor(options: TextareaWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultTextareaOptions(), ...options};
    const rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#x = rect.x;
    this.#y = rect.y;
    this.#width = rect.width;
    this.#height = rect.height;
    this.#colors = {
      normal: {
        fg: parseColor(resolved.colorFgNormal!),
        bg: parseColor(resolved.colorBgNormal!),
        colorBorder: parseColor(resolved.colorBorderUnfocused!),
      },
      focused: {
        fg: parseColor(resolved.colorFgFocused!),
        bg: parseColor(resolved.colorBgFocused!),
        colorBorder: parseColor(resolved.colorBorderFocused!),
      },
      disabled: {
        fg: parseColor(resolved.colorFgDisabled!),
        bg: parseColor(resolved.colorBgDisabled!),
        colorBorder: parseColor(resolved.colorBorderDisabled!),
      },
    };
    this.#borderStyle = resolveBorderStyle(resolved.borderStyle ?? 'solid');
    this.#maxLength = resolved.maxLength ?? 0;
    this.#placeholder = resolved.placeholder ?? '';
    this.#colorPlaceholder = parseColor(resolved.colorPlaceholder!);
    this.#colorSelectionBg = parseColor(resolved.colorSelectionBg!);
    this.#colorSelectionFg = parseColor(resolved.colorSelectionFg!);
    this.#label = resolved.label ?? '';
    this.#isReadonly = resolved.readonly ?? false;
    this.#value = resolved.value ?? '';
    this.setDisabled(resolved.disabled ?? false);

    this.#colorScrollbar = parseColor(resolved.colorScrollbar!);
    this.#colorScrollbarTrack = parseColor(resolved.colorScrollbarTrack!);

    this.#rebuildLines();
    this.#cursorLine = Math.max(0, this.#logicalLines.length - 1);
    this.#cursorCol = this.#logicalLines[this.#cursorLine]!.length;

    this.on('mousedown', mouseData => {
      if (this.disabled) {
        return;
      }

      const targetPos = this.#posFromMouse(mouseData);
      const now = Date.now();
      if (now - this.#lastClickTime < 300
        && targetPos.line === this.#lastClickPos.line
        && targetPos.col === this.#lastClickPos.col) {
        this.#clickCount++;
      } else {
        this.#clickCount = 1;
      }

      this.#lastClickTime = now;
      this.#lastClickPos = targetPos;

      if (this.#clickCount >= 3) {
        this.#selectionAnchor = {line: targetPos.line, col: 0};
        this.#cursorLine = targetPos.line;
        this.#cursorCol = this.#logicalLines[targetPos.line]!.length;
        this.#isSelecting = true;
        this.#clampScrollOffset();
        this.stopPropagation();
        return;
      }

      if (this.#clickCount === 2) {
        const [start, end] = this.#wordRangeAt(targetPos.line, targetPos.col);
        this.#selectionAnchor = {line: targetPos.line, col: start};
        this.#cursorLine = targetPos.line;
        this.#cursorCol = end;
        this.#isSelecting = true;
        this.#clampScrollOffset();
        this.stopPropagation();
        return;
      }

      if (mouseData.shiftKey) {
        if (this.#selectionAnchor === undefined) {
          this.#selectionAnchor = {line: this.#cursorLine, col: this.#cursorCol};
        }
      } else {
        this.#selectionAnchor = {line: targetPos.line, col: targetPos.col};
      }

      this.#cursorLine = targetPos.line;
      this.#cursorCol = targetPos.col;
      this.#isSelecting = true;
      this.#clampScrollOffset();
      this.stopPropagation();
    });

    this.on('mousemove', mouseData => {
      if (!this.#isSelecting) {
        return;
      }

      if (!mouseData.buttons || mouseData.buttons === 0) {
        return;
      }

      const viewport = this.#computeViewport();

      if (mouseData.y < viewport.y && this.#scrollOffsetY > 0) {
        this.#scrollOffsetY--;
        const vl = this.#visualLines[this.#scrollOffsetY];
        if (vl) {
          this.#cursorLine = vl.logicalLine;
          this.#cursorCol = vl.startCol;
        }

        this.stopPropagation();
        return;
      }

      if (mouseData.y >= viewport.y + viewport.height) {
        const targetVisual = Math.min(this.#visualLines.length - 1, this.#scrollOffsetY + viewport.height);
        const vl = this.#visualLines[targetVisual];
        if (vl) {
          this.#cursorLine = vl.logicalLine;
          this.#cursorCol = vl.startCol + vl.charCount;
        }

        this.#clampScrollOffset();
        this.stopPropagation();
        return;
      }

      const targetPos = this.#posFromMouse(mouseData);
      if (targetPos.line !== this.#cursorLine || targetPos.col !== this.#cursorCol) {
        this.#cursorLine = targetPos.line;
        this.#cursorCol = targetPos.col;
        this.#clampScrollOffset();
      }

      this.stopPropagation();
    });

    this.on('mouseup', () => {
      if (this.#isSelecting) {
        this.#isSelecting = false;
        this.stopPropagation();
      }
    });

    this.on('wheel', data => {
      this.scrollBy(data.wheelDeltaY * 3);
    });
  }

  get value(): string {
    return this.#value;
  }

  get readonly(): boolean {
    return this.#isReadonly;
  }

  setReadonly(value: boolean): void {
    this.#isReadonly = value;
  }

  setLabel(value: string): void {
    this.#label = value;
  }

  setMaxLength(value: number): void {
    this.#maxLength = value;
  }

  setPlaceholder(value: string): void {
    this.#placeholder = value;
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

  updateValue(newValue: string): void {
    this.#value = newValue;
    this.#rebuildLines();
    this.#cursorLine = Math.min(this.#cursorLine, this.#logicalLines.length - 1);
    this.#cursorCol = Math.min(this.#cursorCol, this.#logicalLines[this.#cursorLine]!.length);
    this.#selectionAnchor = undefined;
    this.#clampScrollOffset();
  }

  override get acceptsFocus(): boolean {
    return super.acceptsFocus;
  }

  override blur(): void {
    this.#selectionAnchor = undefined;
    super.blur();
  }

  override handleActiveKey(event: KeyboardEvent): void {
    const key = event.key!;
    if (key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (!this.#isReadonly) {
        this.#handleCharInput(key);
      }

      return;
    }

    if (event.ctrlKey && this.#handleCtrlKey(key, event)) {
      return;
    }

    switch (key) {
      case 'Backspace': {
        if (!this.#isReadonly) {
          if (event.ctrlKey) {
            this.#handleWordBackspace();
          } else {
            this.#handleBackspace();
          }
        }

        break;
      }

      case 'Delete': {
        if (!this.#isReadonly) {
          if (event.ctrlKey) {
            this.#handleWordDelete();
          } else {
            this.#handleDelete();
          }
        }

        break;
      }

      case 'ArrowLeft': {
        if (event.ctrlKey) {
          this.#handleWordLeft(event);
        } else {
          this.#handleArrowLeft(event);
        }

        break;
      }

      case 'ArrowRight': {
        if (event.ctrlKey) {
          this.#handleWordRight(event);
        } else {
          this.#handleArrowRight(event);
        }

        break;
      }

      case 'ArrowUp': {
        this.#handleArrowUp(event);
        break;
      }

      case 'ArrowDown': {
        this.#handleArrowDown(event);
        break;
      }

      case 'Home': {
        this.#handleHome(event);
        break;
      }

      case 'End': {
        this.#handleEnd(event);
        break;
      }

      case 'PageUp': {
        this.#handlePageUp(event);
        break;
      }

      case 'PageDown': {
        this.#handlePageDown(event);
        break;
      }

      case 'Enter': {
        if (!this.#isReadonly) {
          this.#handleEnter();
        }

        break;
      }

      case 'Tab': {
        if (!this.#isReadonly) {
          this.#handleTab();
        }

        break;
      }

      case 'Escape': {
        break;
      }

      case 'Insert': {
        this.#cycleCursorMode();
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

  updateThemeColors(resolved: Record<string, unknown>): void {
    applyColorSchemeUpdates(this.#colors, resolved);
    if (resolved.borderStyle !== undefined) {
      this.#borderStyle = resolveBorderStyle(resolved.borderStyle);
    }

    if (resolved.colorPlaceholder !== undefined) {
      this.#colorPlaceholder = parseColor(resolved.colorPlaceholder);
    }

    if (resolved.colorSelectionBg !== undefined) {
      this.#colorSelectionBg = parseColor(resolved.colorSelectionBg);
    }

    if (resolved.colorSelectionFg !== undefined) {
      this.#colorSelectionFg = parseColor(resolved.colorSelectionFg);
    }

    if (resolved.colorScrollbar !== undefined) {
      this.#colorScrollbar = parseColor(resolved.colorScrollbar);
    }

    if (resolved.colorScrollbarTrack !== undefined) {
      this.#colorScrollbarTrack = parseColor(resolved.colorScrollbarTrack);
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

    const viewport = this.#computeViewport();

    buffer.pushClip(viewport.x, viewport.y, viewport.width, viewport.height);

    if (this.#value.length > 0 || this.#logicalLines.length > 1) {
      this.#renderText(buffer, viewport, colors.fg);
    } else if (this.#placeholder.length > 0) {
      const placeholderLines = this.#placeholder.split('\n');
      for (let i = 0; i < Math.min(placeholderLines.length, viewport.height); i++) {
        const line = placeholderLines[i]!;
        buffer.drawText({
          x: viewport.x,
          y: viewport.y + i,
          text: truncateToWidth(line, viewport.width),
          fgRgba: this.#colorPlaceholder,
          bgRgba: 0x00_00_00_00,
        });
      }
    }

    buffer.popClip();

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

      if (this.#label.length > 0) {
        const maxLabelWidth = this.#width - 2;
        const clippedLabel = truncateToWidth(this.#label, maxLabelWidth);
        buffer.drawText({
          x: this.#x + 1,
          y: this.#y,
          text: clippedLabel,
          fgRgba: colors.fg,
          bgRgba: colors.bg,
        });
      }
    }

    if (this.focused && !this.disabled) {
      const cursorVisualLine = this.#cursorToVisualLine();
      const cursorScreenY = viewport.y + cursorVisualLine - this.#scrollOffsetY;
      if (cursorScreenY >= viewport.y && cursorScreenY < viewport.y + viewport.height) {
        const vl = this.#visualLines[cursorVisualLine];
        if (vl) {
          const colInVisual = this.#cursorCol - vl.startCol;
          const textBeforeCursor = vl.text.slice(0, colInVisual);
          const cursorX = viewport.x + stringDisplayWidth(textBeforeCursor);
          buffer.setCursor(cursorX, cursorScreenY);
          buffer.setCursorMode(resolveCursorMode(this.#cursorMode));
          buffer.showCursor();
        }
      }
    }

    this.#renderScrollbar(buffer, viewport);
    buffer.popClip();
  }

  override get rect(): TuiWidgetRect {
    return {
      x: this.#x,
      y: this.#y,
      width: this.#width,
      height: this.#height,
    };
  }

  override intrinsicSize(): TuiWidgetSize | undefined {
    return {width: this.#width, height: this.#height};
  }

  getSelection(): {start: number; end: number; text: string} | undefined {
    const range = this.#getSelectionRange();
    if (range === undefined) {
      return undefined;
    }

    return {
      start: range.start,
      end: range.end,
      text: this.#value.slice(range.start, range.end),
    };
  }

  select(): void {
    this.#selectionAnchor = {line: 0, col: 0};
    this.#cursorLine = this.#logicalLines.length - 1;
    this.#cursorCol = this.#logicalLines[this.#cursorLine]!.length;
    this.#clampScrollOffset();
  }

  setSelectionRange(start: number, end: number): void {
    const a = Math.max(0, Math.min(start, this.#value.length));
    const b = Math.max(0, Math.min(end, this.#value.length));
    const startPos = this.#offsetToPosition(Math.min(a, b));
    const endPos = this.#offsetToPosition(Math.max(a, b));
    this.#selectionAnchor = startPos;
    this.#cursorLine = endPos.line;
    this.#cursorCol = endPos.col;
    this.#clampScrollOffset();
  }

  scrollTo(offset: number): void {
    const maxScroll = this.#maxScrollOffset();
    this.#scrollOffsetY = Math.max(0, Math.min(offset, maxScroll));
  }

  scrollBy(delta: number): void {
    this.scrollTo(this.#scrollOffsetY + delta);
  }

  #cycleCursorMode(): void {
    const modes: CursorModeName[] = ['blinking-ibeam', 'blinking-block', 'blinking-underscore', 'ibeam', 'block', 'underscore'];
    const idx = modes.indexOf(this.#cursorMode);
    this.#cursorMode = modes[(idx + 1) % modes.length]!;
  }

  #rebuildLines(): void {
    this.#logicalLines = this.#value.split('\n');
    if (this.#logicalLines.length === 0) {
      this.#logicalLines = [''];
    }

    this.#rebuildVisualLines();
  }

  #rebuildVisualLines(): void {
    const viewport = this.#computeViewport();
    const maxWidth = viewport.width;
    this.#visualLines = [];
    for (let i = 0; i < this.#logicalLines.length; i++) {
      const line = this.#logicalLines[i]!;
      if (maxWidth <= 0 || line.length === 0) {
        this.#visualLines.push({
          text: line, logicalLine: i, startCol: 0, charCount: line.length,
        });
        continue;
      }

      let col = 0;
      while (col < line.length) {
        const remaining = line.slice(col);
        const segment = truncateToWidth(remaining, maxWidth);
        const segLength = [...segment].length;
        this.#visualLines.push({
          text: segment, logicalLine: i, startCol: col, charCount: segLength,
        });
        col += segLength;
      }
    }
  }

  #computeViewport(): {x: number; y: number; width: number; height: number} {
    const textX = this.#x + 1;
    const textY = this.#y + 1;
    const textWidth = this.#width - 3;
    const textHeight = this.#height - 2;
    return {
      x: textX, y: textY, width: Math.max(0, textWidth), height: Math.max(0, textHeight),
    };
  }

  #maxScrollOffset(): number {
    const viewport = this.#computeViewport();
    return Math.max(0, this.#visualLines.length - viewport.height);
  }

  #clampScrollOffset(): void {
    const cursorVisual = this.#cursorToVisualLine();
    const maxScroll = this.#maxScrollOffset();
    if (this.#scrollOffsetY > maxScroll) {
      this.#scrollOffsetY = maxScroll;
    }

    if (cursorVisual < this.#scrollOffsetY) {
      this.#scrollOffsetY = cursorVisual;
    }

    const viewport = this.#computeViewport();
    if (cursorVisual >= this.#scrollOffsetY + viewport.height) {
      this.#scrollOffsetY = cursorVisual - viewport.height + 1;
    }

    this.#scrollOffsetY = Math.max(0, Math.min(this.#scrollOffsetY, maxScroll));
  }

  #cursorToVisualLine(): number {
    for (let i = 0; i < this.#visualLines.length; i++) {
      const vl = this.#visualLines[i]!;
      if (vl.logicalLine === this.#cursorLine) {
        const endCol = vl.startCol + vl.charCount;
        if (this.#cursorCol <= endCol) {
          return i;
        }

        const nextVl = this.#visualLines[i + 1];
        if (nextVl?.logicalLine !== this.#cursorLine) {
          return i;
        }
      }
    }

    return Math.max(0, this.#visualLines.length - 1);
  }

  #positionToOffset(pos: TextPosition): number {
    let offset = 0;
    for (let i = 0; i < pos.line && i < this.#logicalLines.length; i++) {
      offset += this.#logicalLines[i]!.length + 1;
    }

    return offset + Math.min(pos.col, this.#logicalLines[pos.line]!.length);
  }

  #offsetToPosition(offset: number): TextPosition {
    let remaining = offset;
    for (let i = 0; i < this.#logicalLines.length; i++) {
      const lineLength = this.#logicalLines[i]!.length;
      if (remaining <= lineLength) {
        return {line: i, col: remaining};
      }

      remaining -= lineLength + 1;
    }

    const lastLine = this.#logicalLines.length - 1;
    return {line: lastLine, col: this.#logicalLines[lastLine]!.length};
  }

  #posFromMouse(data: MouseEvent): TextPosition {
    const viewport = this.#computeViewport();
    const relY = data.y - viewport.y;
    const relX = data.x - viewport.x;
    const visualIndex = Math.max(0, Math.min(
      this.#visualLines.length - 1,
      this.#scrollOffsetY + relY,
    ));
    const vl = this.#visualLines[visualIndex];
    if (vl === undefined) {
      const ll = this.#logicalLines.length - 1;
      return {line: ll, col: this.#logicalLines[ll]!.length};
    }

    let colInVisual = charIndexAtColumn(vl.text, relX);
    const textWidth = stringDisplayWidth(vl.text);
    if (textWidth > 0 && relX >= textWidth - 1 && colInVisual < vl.charCount) {
      colInVisual = vl.charCount;
    }

    return {line: vl.logicalLine, col: vl.startCol + colInVisual};
  }

  #wordRangeAt(line: number, col: number): [number, number] {
    const text = this.#logicalLines[line];
    if (text === undefined || text.length === 0) {
      return [0, 0];
    }

    const clamped = Math.min(col, text.length - 1);
    let start = clamped;
    let end = clamped;
    const cat = charCategory(text.codePointAt(clamped)!);
    while (start > 0 && charCategory(text.codePointAt(start - 1)!) === cat) {
      start--;
    }

    while (end < text.length && charCategory(text.codePointAt(end)!) === cat) {
      end++;
    }

    return [start, end];
  }

  #getSelectionRange(): {start: number; end: number} | undefined {
    if (this.#selectionAnchor === undefined) {
      return undefined;
    }

    const anchorOffset = this.#positionToOffset(this.#selectionAnchor);
    const cursorOffset = this.#positionToOffset({line: this.#cursorLine, col: this.#cursorCol});
    if (anchorOffset === cursorOffset) {
      return undefined;
    }

    return anchorOffset < cursorOffset
      ? {start: anchorOffset, end: cursorOffset}
      : {start: cursorOffset, end: anchorOffset};
  }

  #deleteSelection(): boolean {
    const range = this.#getSelectionRange();
    if (range === undefined) {
      return false;
    }

    this.#value = this.#value.slice(0, range.start) + this.#value.slice(range.end);
    this.#rebuildLines();
    const pos = this.#offsetToPosition(range.start);
    this.#cursorLine = pos.line;
    this.#cursorCol = pos.col;
    this.#selectionAnchor = undefined;
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
    return true;
  }

  #updateSelectionForMovement(event: KeyboardEvent): void {
    if (event.shiftKey) {
      if (this.#selectionAnchor === undefined) {
        this.#selectionAnchor = {line: this.#cursorLine, col: this.#cursorCol};
      }
    } else {
      this.#selectionAnchor = undefined;
    }
  }

  #handleCharInput(char: string): void {
    if (this.#maxLength === 0 || this.#value.length < this.#maxLength || this.#getSelectionRange() !== undefined) {
      this.#pushUndo();
      this.#deleteSelection();
      if (this.#maxLength === 0 || this.#value.length < this.#maxLength) {
        const offset = this.#positionToOffset({line: this.#cursorLine, col: this.#cursorCol});
        this.#value = this.#value.slice(0, offset) + char + this.#value.slice(offset);
        this.#rebuildLines();
        this.#cursorCol++;
      }

      this.#clampScrollOffset();
      this.dispatch('input', {value: this.#value});
    }
  }

  #handleEnter(): void {
    this.#pushUndo();
    this.#deleteSelection();
    const offset = this.#positionToOffset({line: this.#cursorLine, col: this.#cursorCol});
    this.#value = this.#value.slice(0, offset) + '\n' + this.#value.slice(offset);
    this.#rebuildLines();
    const charsAfterCursor = this.#logicalLines[this.#cursorLine]!.length - this.#cursorCol;
    this.#cursorLine++;
    this.#cursorCol = this.#logicalLines[this.#cursorLine - 1]!.length - charsAfterCursor;
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
  }

  #handleTab(): void {
    this.#pushUndo();
    this.#deleteSelection();
    const offset = this.#positionToOffset({line: this.#cursorLine, col: this.#cursorCol});
    const tab = '    ';
    this.#value = this.#value.slice(0, offset) + tab + this.#value.slice(offset);
    this.#rebuildLines();
    this.#cursorCol += tab.length;
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
  }

  #handleBackspace(): void {
    if (this.#getSelectionRange() !== undefined) {
      this.#pushUndo();
      this.#deleteSelection();
      return;
    }

    if (this.#cursorLine === 0 && this.#cursorCol === 0) {
      return;
    }

    this.#pushUndo();
    if (this.#cursorCol > 0) {
      const line = this.#logicalLines[this.#cursorLine]!;
      this.#logicalLines[this.#cursorLine] = line.slice(0, this.#cursorCol - 1) + line.slice(this.#cursorCol);
      this.#cursorCol--;
    } else {
      const previousLineLength = this.#logicalLines[this.#cursorLine - 1]!.length;
      this.#logicalLines[this.#cursorLine - 1] += this.#logicalLines[this.#cursorLine]!;
      this.#logicalLines.splice(this.#cursorLine, 1);
      this.#cursorLine--;
      this.#cursorCol = previousLineLength;
    }

    this.#value = this.#logicalLines.join('\n');
    this.#rebuildVisualLines();
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
  }

  #handleDelete(): void {
    if (this.#getSelectionRange() !== undefined) {
      this.#pushUndo();
      this.#deleteSelection();
      return;
    }

    const lastLine = this.#logicalLines.length - 1;
    if (this.#cursorLine === lastLine && this.#cursorCol === this.#logicalLines[lastLine]!.length) {
      return;
    }

    this.#pushUndo();
    if (this.#cursorCol < this.#logicalLines[this.#cursorLine]!.length) {
      const line = this.#logicalLines[this.#cursorLine]!;
      this.#logicalLines[this.#cursorLine] = line.slice(0, this.#cursorCol) + line.slice(this.#cursorCol + 1);
    } else {
      this.#logicalLines[this.#cursorLine] += this.#logicalLines[this.#cursorLine + 1]!;
      this.#logicalLines.splice(this.#cursorLine + 1, 1);
    }

    this.#value = this.#logicalLines.join('\n');
    this.#rebuildVisualLines();
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
  }

  #handleWordBackspace(): void {
    if (this.#getSelectionRange() !== undefined) {
      this.#pushUndo();
      this.#deleteSelection();
      return;
    }

    if (this.#cursorLine === 0 && this.#cursorCol === 0) {
      return;
    }

    this.#pushUndo();
    if (this.#cursorCol > 0) {
      let pos = this.#cursorCol;
      const text = this.#logicalLines[this.#cursorLine]!;
      const cat = charCategory(text.codePointAt(pos - 1)!);
      pos--;
      while (pos > 0 && charCategory(text.codePointAt(pos - 1)!) === cat) {
        pos--;
      }

      this.#logicalLines[this.#cursorLine] = text.slice(0, pos) + text.slice(this.#cursorCol);
      this.#cursorCol = pos;
    } else {
      const previousLineLength = this.#logicalLines[this.#cursorLine - 1]!.length;
      this.#logicalLines[this.#cursorLine - 1] += this.#logicalLines[this.#cursorLine]!;
      this.#logicalLines.splice(this.#cursorLine, 1);
      this.#cursorLine--;
      this.#cursorCol = previousLineLength;
    }

    this.#value = this.#logicalLines.join('\n');
    this.#rebuildVisualLines();
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
  }

  #handleWordDelete(): void {
    if (this.#getSelectionRange() !== undefined) {
      this.#pushUndo();
      this.#deleteSelection();
      return;
    }

    const text = this.#logicalLines[this.#cursorLine]!;
    const lastLine = this.#logicalLines.length - 1;
    if (this.#cursorLine === lastLine && this.#cursorCol >= text.length) {
      return;
    }

    this.#pushUndo();
    if (this.#cursorCol < text.length) {
      let pos = this.#cursorCol;
      const cat = charCategory(text.codePointAt(pos)!);
      pos++;
      while (pos < text.length && charCategory(text.codePointAt(pos)!) === cat) {
        pos++;
      }

      this.#logicalLines[this.#cursorLine] = text.slice(0, this.#cursorCol) + text.slice(pos);
    } else {
      this.#logicalLines[this.#cursorLine] += this.#logicalLines[this.#cursorLine + 1]!;
      this.#logicalLines.splice(this.#cursorLine + 1, 1);
    }

    this.#value = this.#logicalLines.join('\n');
    this.#rebuildVisualLines();
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
  }

  #handleArrowLeft(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    if (this.#cursorCol > 0) {
      this.#cursorCol--;
    } else if (this.#cursorLine > 0) {
      this.#cursorLine--;
      this.#cursorCol = this.#logicalLines[this.#cursorLine]!.length;
    }

    this.#clampScrollOffset();
  }

  #handleArrowRight(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    if (this.#cursorCol < this.#logicalLines[this.#cursorLine]!.length) {
      this.#cursorCol++;
    } else if (this.#cursorLine < this.#logicalLines.length - 1) {
      this.#cursorLine++;
      this.#cursorCol = 0;
    }

    this.#clampScrollOffset();
  }

  #handleArrowUp(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    const cursorVisual = this.#cursorToVisualLine();
    if (cursorVisual > 0) {
      const targetVl = this.#visualLines[cursorVisual - 1]!;
      if (targetVl.logicalLine === this.#cursorLine) {
        this.#cursorCol = Math.min(this.#cursorCol, targetVl.startCol + targetVl.charCount);
      } else {
        this.#cursorLine = targetVl.logicalLine;
        this.#cursorCol = Math.min(this.#cursorCol, this.#logicalLines[this.#cursorLine]!.length);
      }
    } else {
      this.#cursorCol = 0;
    }

    this.#clampScrollOffset();
  }

  #handleArrowDown(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    const cursorVisual = this.#cursorToVisualLine();
    if (cursorVisual < this.#visualLines.length - 1) {
      const targetVl = this.#visualLines[cursorVisual + 1]!;
      if (targetVl.logicalLine === this.#cursorLine) {
        this.#cursorCol = Math.min(this.#cursorCol, targetVl.startCol + targetVl.charCount);
      } else {
        this.#cursorLine = targetVl.logicalLine;
        this.#cursorCol = Math.min(this.#cursorCol, this.#logicalLines[this.#cursorLine]!.length);
      }
    } else {
      this.#cursorCol = this.#logicalLines[this.#cursorLine]!.length;
    }

    this.#clampScrollOffset();
  }

  #handleHome(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    const cursorVisual = this.#cursorToVisualLine();
    const vl = this.#visualLines[cursorVisual];
    if (vl) {
      this.#cursorCol = vl.startCol === 0 ? 0 : vl.startCol;
    }

    this.#clampScrollOffset();
  }

  #handleEnd(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    const cursorVisual = this.#cursorToVisualLine();
    const vl = this.#visualLines[cursorVisual];
    if (vl) {
      const nextVl = this.#visualLines[cursorVisual + 1];
      this.#cursorCol = nextVl?.logicalLine === vl.logicalLine ? vl.startCol + vl.charCount : this.#logicalLines[vl.logicalLine]!.length;
    }

    this.#clampScrollOffset();
  }

  #handlePageUp(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    const viewport = this.#computeViewport();
    const cursorVisual = this.#cursorToVisualLine();
    const targetVisual = Math.max(0, cursorVisual - viewport.height);
    const targetVl = this.#visualLines[targetVisual];
    if (targetVl) {
      this.#cursorLine = targetVl.logicalLine;
      this.#cursorCol = Math.min(this.#cursorCol, this.#logicalLines[this.#cursorLine]!.length);
    }

    this.#clampScrollOffset();
  }

  #handlePageDown(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    const viewport = this.#computeViewport();
    const cursorVisual = this.#cursorToVisualLine();
    const targetVisual = Math.min(this.#visualLines.length - 1, cursorVisual + viewport.height);
    const targetVl = this.#visualLines[targetVisual];
    if (targetVl) {
      this.#cursorLine = targetVl.logicalLine;
      this.#cursorCol = Math.min(this.#cursorCol, this.#logicalLines[this.#cursorLine]!.length);
    }

    this.#clampScrollOffset();
  }

  #handleWordLeft(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    if (this.#cursorCol <= 0) {
      if (this.#cursorLine > 0) {
        this.#cursorLine--;
        this.#cursorCol = this.#logicalLines[this.#cursorLine]!.length;
      }

      this.#clampScrollOffset();
      return;
    }

    let pos = this.#cursorCol;
    const text = this.#logicalLines[this.#cursorLine]!;
    const cat = charCategory(text.codePointAt(pos - 1)!);
    pos--;
    while (pos > 0 && charCategory(text.codePointAt(pos - 1)!) === cat) {
      pos--;
    }

    this.#cursorCol = pos;
    this.#clampScrollOffset();
  }

  #handleWordRight(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    const text = this.#logicalLines[this.#cursorLine]!;
    if (this.#cursorCol >= text.length) {
      if (this.#cursorLine < this.#logicalLines.length - 1) {
        this.#cursorLine++;
        this.#cursorCol = 0;
      }

      this.#clampScrollOffset();
      return;
    }

    let pos = this.#cursorCol;
    const cat = charCategory(text.codePointAt(pos)!);
    pos++;
    while (pos < text.length && charCategory(text.codePointAt(pos)!) === cat) {
      pos++;
    }

    this.#cursorCol = pos;
    this.#clampScrollOffset();
  }

  #handleSelectAll(event: KeyboardEvent): void {
    if (event.ctrlKey && !event.altKey && !event.metaKey && this.#value.length > 0) {
      this.#selectionAnchor = {line: 0, col: 0};
      this.#cursorLine = this.#logicalLines.length - 1;
      this.#cursorCol = this.#logicalLines[this.#cursorLine]!.length;
      this.#clampScrollOffset();
    }
  }

  #handleCtrlKey(key: string, event: KeyboardEvent): boolean {
    if (key === 'a') {
      this.#handleSelectAll(event);
      return true;
    }

    if (key === 'c') {
      this.#handleCopy();
      return true;
    }

    if (key === 'z') {
      if (!this.#isReadonly) {
        this.#handleUndo();
      }

      return true;
    }

    if (key === 'y') {
      if (!this.#isReadonly) {
        this.#handleRedo();
      }

      return true;
    }

    if (key === 'v') {
      if (!this.#isReadonly) {
        this.#handlePaste();
      }

      return true;
    }

    if (key === 'x') {
      if (!this.#isReadonly) {
        this.#handleCut();
      }

      return true;
    }

    return false;
  }

  #handleCopy(): void {
    const sel = this.getSelection();
    if (sel === undefined) {
      return;
    }

    getClipboard().write(sel.text);
    this.dispatch('copy', {text: sel.text});
  }

  #handleCut(): void {
    const sel = this.getSelection();
    if (sel === undefined) {
      return;
    }

    this.#pushUndo();
    getClipboard().write(sel.text);
    this.#deleteSelection();
    this.dispatch('cut', {text: sel.text});
  }

  #handlePaste(): void {
    const text = getClipboard().read();
    if (text.length === 0) {
      return;
    }

    this.#pushUndo();
    this.#deleteSelection();

    if (this.#maxLength > 0 && this.#value.length >= this.#maxLength) {
      return;
    }

    const available = this.#maxLength === 0 ? text.length : this.#maxLength - this.#value.length;
    const toInsert = text.slice(0, available);

    const offset = this.#positionToOffset({line: this.#cursorLine, col: this.#cursorCol});
    this.#value = this.#value.slice(0, offset) + toInsert + this.#value.slice(offset);
    this.#rebuildLines();

    const newOffset = offset + toInsert.length;
    const newPos = this.#offsetToPosition(newOffset);
    this.#cursorLine = newPos.line;
    this.#cursorCol = newPos.col;
    this.#clampScrollOffset();
    this.dispatch('paste', {text: toInsert});
    this.dispatch('input', {value: this.#value});
  }

  #pushUndo(): void {
    if (this.#undoStack.length >= 100) {
      this.#undoStack.shift();
    }

    this.#undoStack.push({
      value: this.#value,
      cursorLine: this.#cursorLine,
      cursorCol: this.#cursorCol,
      selectionAnchor: this.#selectionAnchor,
    });
    this.#redoStack.length = 0;
  }

  #handleUndo(): void {
    if (this.#undoStack.length === 0) {
      return;
    }

    this.#redoStack.push({
      value: this.#value,
      cursorLine: this.#cursorLine,
      cursorCol: this.#cursorCol,
      selectionAnchor: this.#selectionAnchor,
    });
    const snapshot = this.#undoStack.pop()!;
    this.#value = snapshot.value;
    this.#rebuildLines();
    this.#cursorLine = snapshot.cursorLine;
    this.#cursorCol = snapshot.cursorCol;
    this.#selectionAnchor = snapshot.selectionAnchor;
    this.#clampScrollOffset();
    this.dispatch('undo', {value: this.#value});
    this.dispatch('input', {value: this.#value});
  }

  #handleRedo(): void {
    if (this.#redoStack.length === 0) {
      return;
    }

    this.#undoStack.push({
      value: this.#value,
      cursorLine: this.#cursorLine,
      cursorCol: this.#cursorCol,
      selectionAnchor: this.#selectionAnchor,
    });
    const snapshot = this.#redoStack.pop()!;
    this.#value = snapshot.value;
    this.#rebuildLines();
    this.#cursorLine = snapshot.cursorLine;
    this.#cursorCol = snapshot.cursorCol;
    this.#selectionAnchor = snapshot.selectionAnchor;
    this.#clampScrollOffset();
    this.dispatch('redo', {value: this.#value});
    this.dispatch('input', {value: this.#value});
  }

  #logicalLineStartOffset(lineIndex: number): number {
    let offset = 0;
    for (let i = 0; i < lineIndex; i++) {
      offset += this.#logicalLines[i]!.length + 1;
    }

    return offset;
  }

  #renderText(buffer: DrawListBuffer, viewport: {x: number; y: number; width: number; height: number}, fgColor: number): void {
    const range = this.#getSelectionRange();

    for (let i = 0; i < viewport.height; i++) {
      const visualIndex = this.#scrollOffsetY + i;
      if (visualIndex >= this.#visualLines.length) {
        break;
      }

      const vl = this.#visualLines[visualIndex]!;
      const screenY = viewport.y + i;
      const lineStartOffset = this.#logicalLineStartOffset(vl.logicalLine);
      const lineEndOffset = lineStartOffset + this.#logicalLines[vl.logicalLine]!.length;
      const vlStartOffset = lineStartOffset + vl.startCol;
      const vlEndOffset = vlStartOffset + vl.charCount;

      if (range === undefined || lineEndOffset <= range.start || lineStartOffset >= range.end) {
        buffer.drawText({
          x: viewport.x,
          y: screenY,
          text: vl.text,
          fgRgba: fgColor,
          bgRgba: 0x00_00_00_00,
        });
        continue;
      }

      const segStart = Math.max(range.start, vlStartOffset);
      const segEnd = Math.min(range.end, vlEndOffset);
      let drawX = viewport.x;

      if (segStart > vlStartOffset) {
        const prefixChars = segStart - vlStartOffset;
        const seg1 = vl.text.slice(0, prefixChars);
        buffer.drawText({
          x: drawX,
          y: screenY,
          text: seg1,
          fgRgba: fgColor,
          bgRgba: 0x00_00_00_00,
        });
        drawX += stringDisplayWidth(seg1);
      }

      if (segEnd > segStart) {
        const selStartChars = segStart - vlStartOffset;
        const selEndChars = segEnd - vlStartOffset;
        const seg2 = vl.text.slice(selStartChars, selEndChars);
        buffer.drawText({
          x: drawX,
          y: screenY,
          text: seg2,
          fgRgba: this.#colorSelectionFg,
          bgRgba: this.#colorSelectionBg,
        });
        drawX += stringDisplayWidth(seg2);
      }

      if (segEnd < vlEndOffset) {
        const suffixStartChars = segEnd - vlStartOffset;
        const remainingWidth = viewport.width - (drawX - viewport.x);
        if (remainingWidth > 0) {
          const seg3 = truncateToWidth(vl.text.slice(suffixStartChars), remainingWidth);
          buffer.drawText({
            x: drawX,
            y: screenY,
            text: seg3,
            fgRgba: fgColor,
            bgRgba: 0x00_00_00_00,
          });
        }
      }
    }
  }

  #renderScrollbar(buffer: DrawListBuffer, viewport: {x: number; y: number; width: number; height: number}): void {
    const maxScroll = this.#maxScrollOffset();
    if (maxScroll === 0) {
      return;
    }

    const totalVisual = this.#visualLines.length;
    if (totalVisual <= 0) {
      return;
    }

    const scrollbarX = viewport.x + viewport.width + 1;
    const thumbRatio = viewport.height / totalVisual;
    const thumbSize = Math.max(1, Math.round(thumbRatio * viewport.height));
    const scrollableRange = viewport.height - thumbSize;
    const thumbOffset = maxScroll > 0
      ? Math.round((this.#scrollOffsetY / maxScroll) * scrollableRange)
      : 0;

    for (let row = 0; row < viewport.height; row++) {
      const isThumb = row >= thumbOffset && row < thumbOffset + thumbSize;
      buffer.drawChar({
        x: scrollbarX,
        y: viewport.y + row,
        char: isThumb ? 0x25_88 : 0x25_02,
        fgRgba: isThumb ? this.#colorScrollbar : this.#colorScrollbarTrack,
        bgRgba: 0x00_00_00_00,
      });
    }
  }
}

export function createTextareaWidget(options?: Partial<TextareaWidgetOptions>): TextareaWidget {
  const widget = new TextareaWidget({...getDefaultTextareaOptions(), ...options});
  bindThemeToWidget(widget, TEXTAREA_TOKEN_MAP, options ?? {}, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default TextareaWidget;
