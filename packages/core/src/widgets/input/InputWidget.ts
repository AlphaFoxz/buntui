import type {DrawListBuffer} from '../../draw-list/DrawListBuffer';
import {type KeyboardEvent, type MouseEvent} from '../../events/types';
import {BorderSides, resolveCursorMode, type CursorModeName} from '../../draw-list/types';
import {
  resolveBorderStyle,
  type TuiBorderStyleName,
  type TuiWidgetRect,
  type TuiWidgetSize,
} from '../types';
import {ThemedWidget} from '../ThemedWidget';
import {parseColor} from '../../utils/color';
import {stringDisplayWidth, truncateToWidth} from '../../utils/string-width';
import {resolveColorState} from '../color-scheme';
import {getClipboard} from '../../clipboard';
import {charIndexAtColumn} from '../text-editing/text-measure';
import {wordEndAfter, wordRangeAt, wordStartBefore} from '../text-editing/word-boundary';
import {type SelectionRange, deleteRange, normalizeSelectionRange} from '../text-editing/selection';
import {UndoRedoStack} from '../text-editing/undo-redo-stack';
import {clampInsertText, insertTextAt} from '../text-editing/clipboard-edit-ops';
import {cycleCursorMode} from '../text-editing/cursor-mode';
import type {InputWidgetOptions} from './types';

type InputColors = {fg: number; bg: number; colorBorder: number};
type InputExtraColors = {placeholder: number; selectionBg: number; selectionFg: number};
type InputEditState = {value: string; cursorPos: number; selectionAnchor: number | undefined};

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
  };
}

export class InputWidget extends ThemedWidget<InputColors> {
  static override readonly TOKEN_MAP = INPUT_TOKEN_MAP;

  #x: number;
  #y: number;
  #width: number;
  #height: number;

  #borderStyle: number;
  #maxLength: number;
  #placeholder: string;
  readonly #extraColors: InputExtraColors;
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
  readonly #history = new UndoRedoStack<InputEditState>();

  constructor(options: InputWidgetOptions = {}) {
    super(options);
    const resolved = {...getDefaultInputOptions(), ...options};
    const rect = this.initRect(resolved.x, resolved.y, resolved.width, resolved.height);
    this.#x = rect.x;
    this.#y = rect.y;
    this.#width = rect.width;
    this.#height = rect.height;
    this.#borderStyle = resolveBorderStyle(this.resolvedToken('borderStyle') ?? 'solid');
    this.#maxLength = resolved.maxLength ?? 0;
    this.#placeholder = resolved.placeholder ?? '';
    this.#extraColors = {
      placeholder: parseColor(this.resolvedToken('colorPlaceholder')),
      selectionBg: parseColor(this.resolvedToken('colorSelectionBg')),
      selectionFg: parseColor(this.resolvedToken('colorSelectionFg')),
    };
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
        const {dx, dy} = this.computeAccumulatedOffset();
        const btnX = this.#x + this.#width - 2;
        if (mouseData.x - dx === btnX) {
          const textY = this.#y + 1;
          if (mouseData.y - dy === textY) {
            this.#increment();
            this.stopPropagation();
            return;
          }

          if (this.#height === 3 && mouseData.y - dy === textY + 1) {
            this.#decrement();
            this.stopPropagation();
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
        this.stopPropagation();
        return;
      }

      if (this.#clickCount === 2) {
        const [start, end] = this.#wordRangeAt(targetPos);
        this.#selectionAnchor = start;
        this.#cursorPos = end;
        this.#isSelecting = true;
        this.#clampScrollOffset();
        this.stopPropagation();
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
      this.stopPropagation();
    });

    this.on('mousemove', mouseData => {
      if (!this.#isSelecting || !mouseData.buttons || mouseData.buttons === 0) {
        return;
      }

      const {dx} = this.computeAccumulatedOffset();
      const mouse0 = mouseData.x - dx;
      const textX = this.#x + 1;

      if (mouse0 < textX && this.#scrollOffset > 0) {
        this.#scrollOffset--;
        this.#cursorPos = this.#scrollOffset;
        this.stopPropagation();
        return;
      }

      const textEndX = this.#isNumber ? this.#x + this.#width - 3 : this.#x + this.#width - 1;

      if (mouse0 >= textEndX && this.#cursorPos < this.#value.length) {
        this.#cursorPos++;
        this.#clampScrollOffset();
        this.stopPropagation();
        return;
      }

      const targetPos = this.#posFromMouse(mouseData);
      if (targetPos !== this.#cursorPos) {
        this.#cursorPos = targetPos;
        this.#clampScrollOffset();
      }

      this.stopPropagation();
    });

    this.on('mouseup', () => {
      if (!this.#isSelecting) {
        return;
      }

      this.#isSelecting = false;
      this.stopPropagation();
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

      this.stopPropagation();
    });
  }

  get value(): string {
    return this.#value;
  }

  get readonly(): boolean {
    return this.#isReadonly;
  }

  setReadonly(isReadonly: boolean): void {
    this.#isReadonly = isReadonly;
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
      const parsed = this._resolveColorValue(color.colorFg, 'colorFgNormal');
      this.colors.normal.fg = parsed;
      this.colors.focused!.fg = parsed;
    }

    if (color.colorBg === undefined) {
      return;
    }

    const parsed = this._resolveColorValue(color.colorBg, 'colorBgNormal');
    this.colors.normal.bg = parsed;
    this.colors.focused!.bg = parsed;
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

  protected override onThemeColorsUpdated(resolved: Record<string, unknown>): void {
    super.onThemeColorsUpdated(resolved);
    if (resolved.borderStyle !== undefined) {
      this.#borderStyle = resolveBorderStyle(resolved.borderStyle);
    }

    if (resolved.colorPlaceholder !== undefined) {
      this.#extraColors.placeholder = parseColor(resolved.colorPlaceholder);
    }

    if (resolved.colorSelectionBg !== undefined) {
      this.#extraColors.selectionBg = parseColor(resolved.colorSelectionBg);
    }

    if (resolved.colorSelectionFg !== undefined) {
      this.#extraColors.selectionFg = parseColor(resolved.colorSelectionFg);
    }
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    if (this.#width <= 0 || this.#height <= 0) {
      return;
    }

    buffer.pushClip(this.#x, this.#y, this.#width, this.#height);

    const colors = resolveColorState(this.colors, {
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
            fgRgba: this.#extraColors.selectionFg,
            bgRgba: this.#extraColors.selectionBg,
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
        fgRgba: this.#extraColors.placeholder,
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
    this.#cursorMode = cycleCursorMode(this.#cursorMode);
  }

  #maskText(text: string): string {
    return this.#password ? '\u{2022}'.repeat([...text].length) : text;
  }

  #displaySlice(start: number, end?: number): string {
    return this.#maskText(this.#value.slice(start, end));
  }

  #getSelectionRange(): SelectionRange | undefined {
    if (this.#selectionAnchor === undefined) {
      return undefined;
    }

    return normalizeSelectionRange(this.#selectionAnchor, this.#cursorPos);
  }

  #deleteSelection(): boolean {
    const range = this.#getSelectionRange();
    if (range === undefined) {
      return false;
    }

    const result = deleteRange(this.#value, range);
    this.#value = result.value;
    this.#cursorPos = result.cursor;
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
    const {dx} = this.computeAccumulatedOffset();
    const innerX = data.x - dx - this.#x - 1;
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
    return wordRangeAt(this.#value, pos);
  }

  #handleCharInput(key: string): void {
    if (!(this.#maxLength === 0 || this.#value.length < this.#maxLength) && this.#getSelectionRange() === undefined) {
      return;
    }

    this.#pushUndo();
    this.#deleteSelection();
    if (this.#maxLength === 0 || this.#value.length < this.#maxLength) {
      this.#value = insertTextAt(this.#value, this.#cursorPos, key);
      this.#cursorPos++;
    }

    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
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
    const pos = wordStartBefore(this.#value, this.#cursorPos);
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

    if (this.#cursorPos >= this.#value.length) {
      return;
    }

    this.#pushUndo();
    const pos = wordEndAfter(this.#value, this.#cursorPos);
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

    if (!(this.#cursorPos > 0)) {
      return;
    }

    this.#pushUndo();
    this.#value = this.#value.slice(0, this.#cursorPos - 1) + this.#value.slice(this.#cursorPos);
    this.#cursorPos--;
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
  }

  #handleDelete(): void {
    if (this.#getSelectionRange() !== undefined) {
      this.#pushUndo();
      this.#deleteSelection();
      return;
    }

    if (!(this.#cursorPos < this.#value.length)) {
      return;
    }

    this.#pushUndo();
    this.#value = this.#value.slice(0, this.#cursorPos) + this.#value.slice(this.#cursorPos + 1);
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
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
    if (!(this.#cursorPos > 0)) {
      return;
    }

    this.#cursorPos--;
    this.#clampScrollOffset();
  }

  #handleArrowRight(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    if (!(this.#cursorPos < this.#value.length)) {
      return;
    }

    this.#cursorPos++;
    this.#clampScrollOffset();
  }

  #handleWordLeft(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    if (this.#cursorPos <= 0) {
      return;
    }

    this.#cursorPos = wordStartBefore(this.#value, this.#cursorPos);
    this.#clampScrollOffset();
  }

  #handleWordRight(event: KeyboardEvent): void {
    this.#updateSelectionForMovement(event);
    if (this.#cursorPos >= this.#value.length) {
      return;
    }

    this.#cursorPos = wordEndAfter(this.#value, this.#cursorPos);
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
    if (!(event.ctrlKey && !event.altKey && !event.metaKey && this.#value.length > 0)) {
      return;
    }

    this.#selectionAnchor = 0;
    this.#cursorPos = this.#value.length;
    this.#clampScrollOffset();
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
        if (
          (char >= '0' && char <= '9')
          || (char === '.' && !this.#value.includes('.') && !filtered.includes('.'))
          || (char === '-' && filtered.length === 0 && this.#cursorPos === 0 && !this.#value.includes('-'))
        ) {
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

    const toInsert = clampInsertText(text, this.#value.length, this.#maxLength);
    if (toInsert.length === 0) {
      return;
    }

    this.#value = insertTextAt(this.#value, this.#cursorPos, toInsert);
    this.#cursorPos += [...toInsert].length;
    this.#clampScrollOffset();
    this.dispatch('paste', {text: toInsert});
    this.dispatch('input', {value: this.#value});
  }

  #captureState(): InputEditState {
    return {value: this.#value, cursorPos: this.#cursorPos, selectionAnchor: this.#selectionAnchor};
  }

  #restoreState(state: InputEditState): void {
    this.#value = state.value;
    this.#cursorPos = state.cursorPos;
    this.#selectionAnchor = state.selectionAnchor;
  }

  #pushUndo(): void {
    this.#history.pushUndo(this.#captureState());
  }

  #handleUndo(): void {
    const snapshot = this.#history.undo(this.#captureState());
    if (snapshot === undefined) {
      return;
    }

    this.#restoreState(snapshot);
    this.#clampScrollOffset();
    this.dispatch('undo', {value: this.#value});
    this.dispatch('input', {value: this.#value});
  }

  #handleRedo(): void {
    const snapshot = this.#history.redo(this.#captureState());
    if (snapshot === undefined) {
      return;
    }

    this.#restoreState(snapshot);
    this.#clampScrollOffset();
    this.dispatch('redo', {value: this.#value});
    this.dispatch('input', {value: this.#value});
  }

  #handleNumberCharInput(key: string): void {
    if ((key >= '0' && key <= '9') || (key === '-' && this.#cursorPos === 0 && !this.#value.includes('-')) || (key === '.' && !this.#value.includes('.'))) {
      this.#handleCharInput(key);
    }
  }

  #increment(): void {
    const parsed = Number.parseFloat(this.#value);
    const current = Number.isNaN(parsed) ? this.#min : parsed;
    const next = Math.min(this.#max, current + this.#step);
    const newText = String(next);
    if (newText === this.#value) {
      return;
    }

    this.#pushUndo();
    this.#value = newText;
    this.#cursorPos = this.#value.length;
    this.#selectionAnchor = undefined;
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
    this.dispatch('change', {value: next});
  }

  #decrement(): void {
    const parsed = Number.parseFloat(this.#value);
    const current = Number.isNaN(parsed) ? this.#max : parsed;
    const next = Math.max(this.#min, current - this.#step);
    const newText = String(next);
    if (newText === this.#value) {
      return;
    }

    this.#pushUndo();
    this.#value = newText;
    this.#cursorPos = this.#value.length;
    this.#selectionAnchor = undefined;
    this.#clampScrollOffset();
    this.dispatch('input', {value: this.#value});
    this.dispatch('change', {value: next});
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
  return new InputWidget(options ?? {});
}

export default InputWidget;
