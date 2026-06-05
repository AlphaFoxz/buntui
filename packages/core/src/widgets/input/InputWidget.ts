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
import type {InputWidgetOptions} from './types';

type InputColors = {fg: number; bg: number; colorBorder: number};

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

const INPUT_TOKEN_MAP = {
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
} as const;

function getDefaultInputOptions(): InputWidgetOptions {
  return {
    x: 0,
    y: 0,
    width: 32,
    height: 3,
    placeholder: '',
    value: '',
    maxLength: 0,
    label: '',
    readonly: false,
    disabled: false,

    ...resolveWidgetColors(INPUT_TOKEN_MAP),
  };
}

export class InputWidget extends InteractiveWidget {
  #x: number;
  #y: number;
  #width: number;
  #height: number;

  readonly #colors: ColorScheme<InputColors>;
  #borderStyle: number;
  #maxLength: number;
  #placeholder: string;
  #colorPlaceholder: number;
  #colorSelectionBg: number;
  #colorSelectionFg: number;
  #label: string;
  #isReadonly: boolean;

  #value: string;
  readonly #password: boolean;
  readonly #isNumber: boolean;
  #min: number;
  #max: number;
  #step: number;
  #cursorPos = 0;
  #scrollOffset = 0;
  #selectionAnchor: number | undefined;
  #isSelecting = false;
  #clickCount = 0;
  #lastClickTime = 0;
  #lastClickPos = -1;
  #cursorMode: CursorModeName = 'blinking-ibeam';
  readonly #undoStack: Array<{value: string; cursorPos: number; selectionAnchor: number | undefined}> = [];
  readonly #redoStack: Array<{value: string; cursorPos: number; selectionAnchor: number | undefined}> = [];

  constructor(options: InputWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultInputOptions(), ...options};
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
    this.#password = (resolved.type ?? 'text') === 'password';
    this.#isNumber = (resolved.type ?? 'text') === 'number';
    this.#min = resolved.min ?? 0;
    this.#max = resolved.max ?? 100;
    this.#step = resolved.step ?? 1;
    this.#value = resolved.value ?? '';
    this.#cursorPos = this.#value.length;
    this.setDisabled(resolved.disabled ?? false);

    this.on('mousedown', mouseData => {
      if (this.disabled) {
        return;
      }

      if (this.#isNumber) {
        const btnX = this.#x + this.#width - 2;
        if (mouseData.x === btnX) {
          const textY = this.#y + 1;
          if (mouseData.y === textY) {
            this.#increment();
            return;
          }

          if (this.#height === 3 && mouseData.y === textY + 1) {
            this.#decrement();
            return;
          }
        }
      }

      const targetPos = this.#posFromMouse(mouseData);
      const now = Date.now();
      if (now - this.#lastClickTime < 300 && targetPos === this.#lastClickPos) {
        this.#clickCount++;
      } else {
        this.#clickCount = 1;
      }

      this.#lastClickTime = now;
      this.#lastClickPos = targetPos;

      if (this.#clickCount >= 3) {
        this.#selectionAnchor = 0;
        this.#cursorPos = this.#value.length;
        this.#isSelecting = true;
        this.#clampScrollOffset();
        return;
      }

      if (this.#clickCount === 2) {
        const [start, end] = this.#wordRangeAt(targetPos);
        this.#selectionAnchor = start;
        this.#cursorPos = end;
        this.#isSelecting = true;
        this.#clampScrollOffset();
        return;
      }

      if (mouseData.shiftKey) {
        if (this.#selectionAnchor === undefined) {
          this.#selectionAnchor = this.#cursorPos;
        }
      } else {
        this.#selectionAnchor = targetPos;
      }

      this.#cursorPos = targetPos;
      this.#isSelecting = true;
      this.#clampScrollOffset();
    });

    this.on('mousemove', mouseData => {
      if (!this.#isSelecting) {
        return;
      }

      if (!mouseData.buttons || mouseData.buttons === 0) {
        return;
      }

      const mouse0 = mouseData.x;
      const textX = this.#x + 1;
      const textEndX = this.#isNumber ? this.#x + this.#width - 3 : this.#x + this.#width - 1;

      // Auto-scroll backward when dragging left past text area
      if (mouse0 < textX && this.#scrollOffset > 0) {
        this.#scrollOffset--;
        this.#cursorPos = this.#scrollOffset;
        return;
      }

      // Auto-scroll forward when dragging right past text area
      if (mouse0 >= textEndX && this.#cursorPos < this.#value.length) {
        this.#cursorPos++;
        this.#clampScrollOffset();
        return;
      }

      const targetPos = this.#posFromMouse(mouseData);
      if (targetPos !== this.#cursorPos) {
        this.#cursorPos = targetPos;
        this.#clampScrollOffset();
      }
    });

    this.on('mouseup', () => {
      this.#isSelecting = false;
    });

    this.on('wheel', data => {
      if (this.disabled || !this.#isNumber) {
        return;
      }

      if (data.wheelDeltaY > 0) {
        this.#increment();
      } else if (data.wheelDeltaY < 0) {
        this.#decrement();
      }
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

  setMin(value: number): void {
    this.#min = value;
  }

  setMax(value: number): void {
    this.#max = value;
  }

  setStep(value: number): void {
    this.#step = value;
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
    this.#cursorPos = Math.min(this.#cursorPos, this.#value.length);
    this.#selectionAnchor = undefined;
    this.#clampScrollOffset();
  }

  override get acceptsFocus(): boolean {
    return super.acceptsFocus;
  }

  override blur(): void {
    if (this.#isNumber) {
      this.#commitNumber();
    }

    this.#selectionAnchor = undefined;
    super.blur();
  }

  override handleActiveKey(event: KeyboardEvent): void {
    const key = event.key!;
    if (key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (!this.#isReadonly) {
        if (this.#isNumber) {
          this.#handleNumberCharInput(key);
        } else {
          this.#handleCharInput(key);
        }
      }

      return;
    }

    if (event.ctrlKey && this.#handleCtrlKey(key, event)) {
      return;
    }

    if (this.#isNumber) {
      if (key === 'ArrowUp') {
        this.#increment();
        return;
      }

      if (key === 'ArrowDown') {
        this.#decrement();
        return;
      }
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

      case 'Home': {
        this.#handleHome(event);
        break;
      }

      case 'End': {
        this.#handleEnd(event);
        break;
      }

      case 'Escape': {
        break;
      }

      case 'Insert': {
        this.#cycleCursorMode();
        break;
      }

      case 'Enter': {
        if (this.#isNumber) {
          this.#commitNumber();
        }

        this.#selectionAnchor = undefined;
        this.dispatch('submit', {value: this.#value});
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
      this.#borderStyle = resolveBorderStyle(resolved.borderStyle as TuiBorderStyleName);
    }

    if (resolved.colorPlaceholder !== undefined) {
      this.#colorPlaceholder = parseColor(resolved.colorPlaceholder as number);
    }

    if (resolved.colorSelectionBg !== undefined) {
      this.#colorSelectionBg = parseColor(resolved.colorSelectionBg as number);
    }

    if (resolved.colorSelectionFg !== undefined) {
      this.#colorSelectionFg = parseColor(resolved.colorSelectionFg as number);
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

    // Text content or placeholder
    const textX = this.#x + 1;
    const textY = this.#y + 1;
    const visibleWidth = this.#isNumber ? this.#width - 4 : this.#width - 2;

    if (this.#value.length > 0) {
      const range = this.#getSelectionRange();
      const textFromScroll = this.#value.slice(this.#scrollOffset);
      const maskedFromScroll = this.#maskText(textFromScroll);
      const visibleText = truncateToWidth(maskedFromScroll, visibleWidth);
      const visibleEnd = this.#scrollOffset + [...visibleText].length;

      if (range === undefined) {
        buffer.drawText({
          x: textX,
          y: textY,
          text: visibleText,
          fgRgba: colors.fg,
          bgRgba: 0x00_00_00_00,
        });
      } else {
        const segStart = Math.max(range.start, this.#scrollOffset);
        const segEnd = Math.min(range.end, visibleEnd);
        let drawX = textX;

        if (segStart > this.#scrollOffset) {
          const seg1Masked = this.#maskText(this.#value.slice(this.#scrollOffset, segStart));
          const clipped1 = truncateToWidth(seg1Masked, visibleWidth - (drawX - textX));
          buffer.drawText({
            x: drawX,
            y: textY,
            text: clipped1,
            fgRgba: colors.fg,
            bgRgba: 0x00_00_00_00,
          });
          drawX += stringDisplayWidth(clipped1);
        }

        if (segEnd > segStart) {
          const remainingWidth = visibleWidth - (drawX - textX);
          const seg2Masked = this.#maskText(this.#value.slice(segStart, segEnd));
          const clipped2 = truncateToWidth(seg2Masked, remainingWidth);
          buffer.drawText({
            x: drawX,
            y: textY,
            text: clipped2,
            fgRgba: this.#colorSelectionFg,
            bgRgba: this.#colorSelectionBg,
          });
          drawX += stringDisplayWidth(clipped2);
        }

        if (segEnd < visibleEnd) {
          const remainingWidth = visibleWidth - (drawX - textX);
          if (remainingWidth > 0) {
            const seg3Masked = this.#maskText(this.#value.slice(segEnd, visibleEnd));
            const clipped3 = truncateToWidth(seg3Masked, remainingWidth);
            buffer.drawText({
              x: drawX,
              y: textY,
              text: clipped3,
              fgRgba: colors.fg,
              bgRgba: 0x00_00_00_00,
            });
          }
        }
      }
    } else if (this.#placeholder.length > 0) {
      buffer.drawText({
        x: textX,
        y: textY,
        text: this.#placeholder.slice(0, visibleWidth),
        fgRgba: this.#colorPlaceholder,
        bgRgba: 0x00_00_00_00,
      });
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

      if (this.#label.length > 0) {
        const maxLabelWidth = this.#isNumber ? this.#width - 4 : this.#width - 2;
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

    if (this.#isNumber) {
      const btnX = this.#x + this.#width - 2;
      const textY = this.#y + 1;
      buffer.drawChar({
        x: btnX,
        y: textY,
        char: 0x25_B2,
        fgRgba: colors.fg,
        bgRgba: colors.bg,
      });
      if (this.#height >= 3) {
        buffer.drawChar({
          x: btnX,
          y: textY + 1,
          char: 0x25_BC,
          fgRgba: colors.fg,
          bgRgba: colors.bg,
        });
      }
    }

    // Cursor
    if (this.focused && !this.disabled) {
      const textBeforeCursor = this.#maskText(this.#value.slice(this.#scrollOffset, this.#cursorPos));
      const cursorX = textX + stringDisplayWidth(textBeforeCursor);
      buffer.setCursor(cursorX, textY);
      buffer.setCursorMode(resolveCursorMode(this.#cursorMode));
      buffer.showCursor();
    }

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
    this.#selectionAnchor = 0;
    this.#cursorPos = this.#value.length;
    this.#clampScrollOffset();
  }

  setSelectionRange(start: number, end: number): void {
    const a = Math.max(0, Math.min(start, this.#value.length));
    const b = Math.max(0, Math.min(end, this.#value.length));
    this.#selectionAnchor = Math.min(a, b);
    this.#cursorPos = Math.max(a, b);
    this.#clampScrollOffset();
  }

  #cycleCursorMode(): void {
    const modes: CursorModeName[] = ['blinking-ibeam', 'blinking-block', 'blinking-underscore', 'ibeam', 'block', 'underscore'];
    const idx = modes.indexOf(this.#cursorMode);
    this.#cursorMode = modes[(idx + 1) % modes.length]!;
  }

  #maskText(text: string): string {
    if (!this.#password) {
      return text;
    }

    return '\u2022'.repeat([...text].length);
  }

  #displaySlice(start: number, end?: number): string {
    return this.#maskText(this.#value.slice(start, end));
  }

  #getSelectionRange(): {start: number; end: number} | undefined {
    if (this.#selectionAnchor === undefined || this.#selectionAnchor === this.#cursorPos) {
      return undefined;
    }

    return this.#selectionAnchor < this.#cursorPos
      ? {start: this.#selectionAnchor, end: this.#cursorPos}
      : {start: this.#cursorPos, end: this.#selectionAnchor};
  }

  #deleteSelection(): boolean {
    const range = this.#getSelectionRange();
    if (range === undefined) {
      return false;
    }

    this.#value = this.#value.slice(0, range.start) + this.#value.slice(range.end);
    this.#cursorPos = range.start;
    this.#selectionAnchor = undefined;
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
    return true;
  }

  #clampScrollOffset(): void {
    const visibleWidth = this.#isNumber ? this.#width - 4 : this.#width - 2;
    if (visibleWidth <= 0) {
      return;
    }

    if (this.#cursorPos < this.#scrollOffset) {
      this.#scrollOffset = this.#cursorPos;
    }

    const cursorRelativeWidth = stringDisplayWidth(this.#displaySlice(this.#scrollOffset, this.#cursorPos));
    if (cursorRelativeWidth >= visibleWidth) {
      while (this.#scrollOffset < this.#cursorPos) {
        this.#scrollOffset++;
        if (stringDisplayWidth(this.#displaySlice(this.#scrollOffset, this.#cursorPos)) < visibleWidth) {
          break;
        }
      }
    }

    while (this.#scrollOffset > 0) {
      const candidateOffset = this.#scrollOffset - 1;
      if (stringDisplayWidth(this.#displaySlice(candidateOffset)) <= visibleWidth) {
        this.#scrollOffset = candidateOffset;
      } else {
        break;
      }
    }
  }

  #posFromMouse(data: MouseEvent): number {
    const innerX = data.x - this.#x - 1;
    const visibleWidth = this.#isNumber ? this.#width - 4 : this.#width - 2;
    if (innerX < 0 || innerX >= visibleWidth) {
      return this.#cursorPos;
    }

    const displayed = this.#displaySlice(this.#scrollOffset);
    return Math.max(0, Math.min(
      this.#value.length,
      this.#scrollOffset + charIndexAtColumn(displayed, innerX),
    ));
  }

  #wordRangeAt(pos: number): [number, number] {
    const {length} = this.#value;
    if (length === 0) {
      return [0, 0];
    }

    const clamped = Math.min(pos, length - 1);
    let start = clamped;
    let end = clamped;
    const cat = charCategory(this.#value.codePointAt(clamped)!);
    while (start > 0 && charCategory(this.#value.codePointAt(start - 1)!) === cat) {
      start--;
    }

    while (end < length && charCategory(this.#value.codePointAt(end)!) === cat) {
      end++;
    }

    return [start, end];
  }

  #handleCharInput(key: string): void {
    if (this.#maxLength === 0 || this.#value.length < this.#maxLength || this.#getSelectionRange() !== undefined) {
      this.#pushUndo();
      this.#deleteSelection();
      if (this.#maxLength === 0 || this.#value.length < this.#maxLength) {
        this.#value = this.#value.slice(0, this.#cursorPos) + key + this.#value.slice(this.#cursorPos);
        this.#cursorPos++;
      }

      this.#clampScrollOffset();
      this.dispatch('input', {value: this.#value});
    }
  }

  #handleWordBackspace(): void {
    if (this.#getSelectionRange() !== undefined) {
      this.#pushUndo();
      this.#deleteSelection();
      return;
    }

    if (this.#cursorPos <= 0) {
      return;
    }

    this.#pushUndo();
    let pos = this.#cursorPos;
    const cat = charCategory(this.#value.codePointAt(pos - 1)!);
    pos--;
    while (pos > 0 && charCategory(this.#value.codePointAt(pos - 1)!) === cat) {
      pos--;
    }

    this.#value = this.#value.slice(0, pos) + this.#value.slice(this.#cursorPos);
    this.#cursorPos = pos;
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
  }

  #handleWordDelete(): void {
    if (this.#getSelectionRange() !== undefined) {
      this.#pushUndo();
      this.#deleteSelection();
      return;
    }

    const {length} = this.#value;
    if (this.#cursorPos >= length) {
      return;
    }

    this.#pushUndo();
    let pos = this.#cursorPos;
    const cat = charCategory(this.#value.codePointAt(pos)!);
    pos++;
    while (pos < length && charCategory(this.#value.codePointAt(pos)!) === cat) {
      pos++;
    }

    this.#value = this.#value.slice(0, this.#cursorPos) + this.#value.slice(pos);
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
  }

  #handleBackspace(): void {
    if (this.#getSelectionRange() !== undefined) {
      this.#pushUndo();
      this.#deleteSelection();
      return;
    }

    if (this.#cursorPos > 0) {
      this.#pushUndo();
      this.#value = this.#value.slice(0, this.#cursorPos - 1) + this.#value.slice(this.#cursorPos);
      this.#cursorPos--;
      this.#clampScrollOffset();
      this.dispatch('input', {value: this.#value});
    }
  }

  #handleDelete(): void {
    if (this.#getSelectionRange() !== undefined) {
      this.#pushUndo();
      this.#deleteSelection();
      return;
    }

    if (this.#cursorPos < this.#value.length) {
      this.#pushUndo();
      this.#value = this.#value.slice(0, this.#cursorPos) + this.#value.slice(this.#cursorPos + 1);
      this.#clampScrollOffset();
      this.dispatch('input', {value: this.#value});
    }
  }

  #updateSelectionForMovement(event: KeyboardEvent): void {
    if (event.shiftKey) {
      if (this.#selectionAnchor === undefined) {
        this.#selectionAnchor = this.#cursorPos;
      }
    } else {
      this.#selectionAnchor = undefined;
    }
  }

  #handleArrowLeft(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    if (this.#cursorPos > 0) {
      this.#cursorPos--;
      this.#clampScrollOffset();
    }
  }

  #handleArrowRight(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    if (this.#cursorPos < this.#value.length) {
      this.#cursorPos++;
      this.#clampScrollOffset();
    }
  }

  #handleWordLeft(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    if (this.#cursorPos <= 0) {
      return;
    }

    let pos = this.#cursorPos;
    const cat = charCategory(this.#value.codePointAt(pos - 1)!);
    pos--;
    while (pos > 0 && charCategory(this.#value.codePointAt(pos - 1)!) === cat) {
      pos--;
    }

    this.#cursorPos = pos;
    this.#clampScrollOffset();
  }

  #handleWordRight(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    const {length} = this.#value;
    if (this.#cursorPos >= length) {
      return;
    }

    let pos = this.#cursorPos;
    const cat = charCategory(this.#value.codePointAt(pos)!);
    pos++;
    while (pos < length && charCategory(this.#value.codePointAt(pos)!) === cat) {
      pos++;
    }

    this.#cursorPos = pos;
    this.#clampScrollOffset();
  }

  #handleHome(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    this.#cursorPos = 0;
    this.#scrollOffset = 0;
  }

  #handleEnd(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    this.#cursorPos = this.#value.length;
    this.#clampScrollOffset();
  }

  #handleSelectAll(event: KeyboardEvent): void {
    if (event.ctrlKey && !event.altKey && !event.metaKey && this.#value.length > 0) {
      this.#selectionAnchor = 0;
      this.#cursorPos = this.#value.length;
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
    let text = getClipboard().read();
    if (text.length === 0) {
      return;
    }

    if (this.#isNumber) {
      let filtered = '';
      for (const char of text) {
        if (char >= '0' && char <= '9') {
          filtered += char;
        } else if (char === '.' && !this.#value.includes('.') && !filtered.includes('.')) {
          filtered += char;
        } else if (char === '-' && filtered.length === 0 && this.#cursorPos === 0 && !this.#value.includes('-')) {
          filtered += char;
        }
      }

      text = filtered;
      if (text.length === 0) {
        return;
      }
    }

    this.#pushUndo();
    this.#deleteSelection();

    if (this.#maxLength > 0 && this.#value.length >= this.#maxLength) {
      return;
    }

    const available = this.#maxLength === 0 ? text.length : this.#maxLength - this.#value.length;
    const toInsert = text.slice(0, available);

    this.#value = this.#value.slice(0, this.#cursorPos) + toInsert + this.#value.slice(this.#cursorPos);
    this.#cursorPos += [...toInsert].length;
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
      cursorPos: this.#cursorPos,
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
      cursorPos: this.#cursorPos,
      selectionAnchor: this.#selectionAnchor,
    });
    const snapshot = this.#undoStack.pop()!;
    this.#value = snapshot.value;
    this.#cursorPos = snapshot.cursorPos;
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
      cursorPos: this.#cursorPos,
      selectionAnchor: this.#selectionAnchor,
    });
    const snapshot = this.#redoStack.pop()!;
    this.#value = snapshot.value;
    this.#cursorPos = snapshot.cursorPos;
    this.#selectionAnchor = snapshot.selectionAnchor;
    this.#clampScrollOffset();
    this.dispatch('redo', {value: this.#value});
    this.dispatch('input', {value: this.#value});
  }

  #handleNumberCharInput(key: string): void {
    if (key >= '0' && key <= '9') {
      this.#handleCharInput(key);
    } else if (key === '-' && this.#cursorPos === 0 && !this.#value.includes('-')) {
      this.#handleCharInput(key);
    } else if (key === '.' && !this.#value.includes('.')) {
      this.#handleCharInput(key);
    }
  }

  #increment(): void {
    const parsed = Number.parseFloat(this.#value);
    const current = Number.isNaN(parsed) ? this.#min : parsed;
    const next = Math.min(this.#max, current + this.#step);
    const newText = String(next);
    if (newText !== this.#value) {
      this.#pushUndo();
      this.#value = newText;
      this.#cursorPos = this.#value.length;
      this.#selectionAnchor = undefined;
      this.#clampScrollOffset();
      this.dispatch('input', {value: this.#value});
      this.dispatch('change', {value: next});
    }
  }

  #decrement(): void {
    const parsed = Number.parseFloat(this.#value);
    const current = Number.isNaN(parsed) ? this.#max : parsed;
    const next = Math.max(this.#min, current - this.#step);
    const newText = String(next);
    if (newText !== this.#value) {
      this.#pushUndo();
      this.#value = newText;
      this.#cursorPos = this.#value.length;
      this.#selectionAnchor = undefined;
      this.#clampScrollOffset();
      this.dispatch('input', {value: this.#value});
      this.dispatch('change', {value: next});
    }
  }

  #commitNumber(): void {
    const parsed = Number.parseFloat(this.#value);
    if (Number.isNaN(parsed)) {
      this.#value = String(this.#min);
    } else {
      const clamped = Math.max(this.#min, Math.min(this.#max, parsed));
      this.#value = String(clamped);
    }

    this.#cursorPos = this.#value.length;
    this.#selectionAnchor = undefined;
    this.#clampScrollOffset();
  }
}

export function createInputWidget(options?: Partial<InputWidgetOptions>): InputWidget {
  const widget = new InputWidget({...getDefaultInputOptions(), ...options});
  bindThemeToWidget(widget, INPUT_TOKEN_MAP, options ?? {}, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default InputWidget;
