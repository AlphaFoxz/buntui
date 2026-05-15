import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent, type MouseEvent} from '../../events/types';
import {BorderSides, CursorMode} from '../../draw_list/types';
import {resolveBorderStyle, type TuiWidgetRect} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {Focusable} from '../Focusable';
import {parseColor} from '../../utils/color';
import {charDisplayWidth, stringDisplayWidth, truncateToWidth} from '../../utils/string-width';
import {getTheme} from '../../theme/provider';
import {extractPercentSpec, isPercent} from '../../utils/percent';
import type {InputWidgetOptions} from './types';

function charIndexAtColumn(string_: string, column: number): number {
  let width = 0;
  let index = 0;
  for (const char of string_) {
    const cw = charDisplayWidth(char);
    if (width + cw > column) {
      break;
    }

    width += cw;
    index++;
  }

  return index;
}

function getDefaultInputOptions(): InputWidgetOptions {
  const theme = getTheme();
  return {
    x: 0,
    y: 0,
    width: 32,
    height: 3,
    placeholder: '',
    value: '',
    colorFg: theme.colors.text,
    colorBg: theme.colors.surface,
    borderColorUnfocused: theme.colors.border,
    borderColorFocused: theme.colors.borderFocused,
    borderStyle: theme.borderStyle.normal,
    maxLength: 0,
    selectionBgColor: theme.colors.selectionBg,
    selectionFgColor: theme.colors.selectionFg,
    readonly: false,
  };
}

export class InputWidget extends TuiWidgetEntity implements Focusable {
  #x: number;
  #y: number;
  #width: number;
  #height: number;

  readonly #colorFg: number;
  readonly #colorBg: number;
  readonly #borderColorUnfocused: number;
  readonly #borderColorFocused: number;
  readonly #borderStyle: number;
  readonly #maxLength: number;
  readonly #placeholder: string;
  readonly #selectionBgColor: number;
  readonly #selectionFgColor: number;
  readonly #label: string;
  #isReadonly: boolean;

  #value: string;
  #cursorPos = 0;
  #focused = false;
  #scrollOffset = 0;
  #selectionAnchor: number | undefined;
  #isSelecting = false;

  constructor(options: InputWidgetOptions = {}) {
    super();
    const resolved = {...getDefaultInputOptions(), ...options};
    const spec = extractPercentSpec(resolved.x, resolved.y, resolved.width, resolved.height);
    if (spec) {
      this.setPercentSpec(spec);
    }

    this.#x = isPercent(resolved.x) ? 0 : (resolved.x ?? 0);
    this.#y = isPercent(resolved.y) ? 0 : (resolved.y ?? 0);
    this.#width = isPercent(resolved.width) ? 0 : (resolved.width ?? 32);
    this.#height = isPercent(resolved.height) ? 0 : (resolved.height ?? 3);
    this.#colorFg = parseColor(resolved.colorFg ?? 0xFF_FF_FF_FF);
    this.#colorBg = parseColor(resolved.colorBg ?? 0x1E_1E_2E_FF);
    this.#borderColorUnfocused = parseColor(resolved.borderColorUnfocused ?? 0x45_47_5A_FF);
    this.#borderColorFocused = parseColor(resolved.borderColorFocused ?? 0x89_B4_FA_FF);
    this.#borderStyle = resolveBorderStyle(resolved.borderStyle ?? 'solid');
    this.#maxLength = resolved.maxLength ?? 0;
    this.#placeholder = resolved.placeholder ?? '';
    this.#selectionBgColor = parseColor(resolved.selectionBgColor ?? 0x26_4F_78_FF);
    this.#selectionFgColor = parseColor(resolved.selectionFgColor ?? 0xFF_FF_FF_FF);
    this.#label = resolved.label ?? '';
    this.#isReadonly = resolved.readonly ?? false;
    this.#value = resolved.value ?? '';
    this.#cursorPos = this.#value.length;

    this.on('mousedown', mouseData => {
      const targetPos = this.#posFromMouse(mouseData);

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

      const mouse0 = mouseData.x - 1;
      const textX = this.#x + 1;
      const textEndX = this.#x + this.#width - 1;

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

  updateValue(newValue: string): void {
    this.#value = newValue;
    this.#cursorPos = Math.min(this.#cursorPos, this.#value.length);
    this.#selectionAnchor = undefined;
    this.#clampScrollOffset();
  }

  get acceptsFocus(): boolean {
    return !this.#isReadonly;
  }

  focus(): void {
    this.#focused = true;
    this.dispatch('focus', undefined);
  }

  blur(): void {
    this.#focused = false;
    this.#selectionAnchor = undefined;
    this.dispatch('blur', undefined);
  }

  handleKey(event: KeyboardEvent): void {
    if (this.#isReadonly) {
      return;
    }

    if (event.key === undefined) {
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      this.#handleCharInput(event.key);
      return;
    }

    switch (event.key) {
      case 'Backspace': {
        this.#handleBackspace();
        break;
      }

      case 'Delete': {
        this.#handleDelete();
        break;
      }

      case 'ArrowLeft': {
        this.#handleArrowLeft(event);
        break;
      }

      case 'ArrowRight': {
        this.#handleArrowRight(event);
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

      case 'a': {
        this.#handleSelectAll(event);
        break;
      }

      case 'Escape': {
        this.#handleEscape();
        break;
      }

      case 'Enter': {
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

  override emitDrawCommands(buffer: DrawListBuffer): void {
    if (this.#width <= 0 || this.#height <= 0) {
      return;
    }

    buffer.pushClip(this.#x, this.#y, this.#width, this.#height);

    // Background
    buffer.drawRect({
      x: this.#x,
      y: this.#y,
      width: this.#width,
      height: this.#height,
      bgRgba: this.#colorBg,
    });

    // Text content or placeholder
    const textX = this.#x + 1;
    const textY = this.#y + 1;
    const visibleWidth = this.#width - 2;

    if (this.#value.length > 0) {
      const range = this.#getSelectionRange();
      const textFromScroll = this.#value.slice(this.#scrollOffset);
      const visibleText = truncateToWidth(textFromScroll, visibleWidth);
      const visibleEnd = this.#scrollOffset + [...visibleText].length;

      if (range === undefined) {
        buffer.drawText({
          x: textX,
          y: textY,
          text: visibleText,
          fgRgba: this.#colorFg,
          bgRgba: 0x00_00_00_00,
        });
      } else {
        const segStart = Math.max(range.start, this.#scrollOffset);
        const segEnd = Math.min(range.end, visibleEnd);
        let drawX = textX;

        // Before selection
        if (segStart > this.#scrollOffset) {
          const seg1 = this.#value.slice(this.#scrollOffset, segStart);
          const clipped1 = truncateToWidth(seg1, visibleWidth - (drawX - textX));
          buffer.drawText({
            x: drawX,
            y: textY,
            text: clipped1,
            fgRgba: this.#colorFg,
            bgRgba: 0x00_00_00_00,
          });
          drawX += stringDisplayWidth(clipped1);
        }

        // Selected portion
        if (segEnd > segStart) {
          const remainingWidth = visibleWidth - (drawX - textX);
          const seg2 = this.#value.slice(segStart, segEnd);
          const clipped2 = truncateToWidth(seg2, remainingWidth);
          buffer.drawText({
            x: drawX,
            y: textY,
            text: clipped2,
            fgRgba: this.#selectionFgColor,
            bgRgba: this.#selectionBgColor,
          });
          drawX += stringDisplayWidth(clipped2);
        }

        // After selection
        if (segEnd < visibleEnd) {
          const remainingWidth = visibleWidth - (drawX - textX);
          if (remainingWidth > 0) {
            const seg3 = this.#value.slice(segEnd, visibleEnd);
            const clipped3 = truncateToWidth(seg3, remainingWidth);
            buffer.drawText({
              x: drawX,
              y: textY,
              text: clipped3,
              fgRgba: this.#colorFg,
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
        fgRgba: 0x6C_70_86_FF,
        bgRgba: 0x00_00_00_00,
      });
    }

    // Border
    if (this.#borderStyle !== 0) {
      const borderColor = this.#focused ? this.#borderColorFocused : this.#borderColorUnfocused;
      buffer.drawBorder({
        x: this.#x,
        y: this.#y,
        width: this.#width,
        height: this.#height,
        colorRgba: borderColor,
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
          fgRgba: this.#colorFg,
          bgRgba: this.#colorBg,
        });
      }
    }

    // Cursor
    if (this.#focused) {
      const textBeforeCursor = this.#value.slice(this.#scrollOffset, this.#cursorPos);
      const cursorX = textX + stringDisplayWidth(textBeforeCursor);
      buffer.setCursor(cursorX, textY);
      buffer.setCursorMode(CursorMode.BlinkingIBeam);
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

  override unmounted(): void {
    super.unmounted();
    if (this.#focused) {
      this.blur();
    }
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
    const visibleWidth = this.#width - 2;
    if (visibleWidth <= 0) {
      return;
    }

    if (this.#cursorPos < this.#scrollOffset) {
      this.#scrollOffset = this.#cursorPos;
    }

    const textBeforeCursor = this.#value.slice(this.#scrollOffset, this.#cursorPos);
    const cursorRelativeWidth = stringDisplayWidth(textBeforeCursor);
    if (cursorRelativeWidth >= visibleWidth) {
      while (this.#scrollOffset < this.#cursorPos) {
        this.#scrollOffset++;
        const testText = this.#value.slice(this.#scrollOffset, this.#cursorPos);
        if (stringDisplayWidth(testText) < visibleWidth) {
          break;
        }
      }
    }

    // Scroll back when text shrinks and there's unused visible space
    while (this.#scrollOffset > 0) {
      const candidateOffset = this.#scrollOffset - 1;
      const textFromCandidate = this.#value.slice(candidateOffset);
      if (stringDisplayWidth(textFromCandidate) <= visibleWidth) {
        this.#scrollOffset = candidateOffset;
      } else {
        break;
      }
    }
  }

  #posFromMouse(data: MouseEvent): number {
    const innerX = (data.x - 1) - this.#x - 1;
    const textFromScroll = this.#value.slice(this.#scrollOffset);
    return Math.max(0, Math.min(
      this.#value.length,
      this.#scrollOffset + charIndexAtColumn(textFromScroll, innerX),
    ));
  }

  #handleCharInput(key: string): void {
    if (this.#maxLength === 0 || this.#value.length < this.#maxLength || this.#getSelectionRange() !== undefined) {
      this.#deleteSelection();
      if (this.#maxLength === 0 || this.#value.length < this.#maxLength) {
        this.#value = this.#value.slice(0, this.#cursorPos) + key + this.#value.slice(this.#cursorPos);
        this.#cursorPos++;
      }

      this.#clampScrollOffset();
      this.dispatch('input', {value: this.#value});
    }
  }

  #handleBackspace(): void {
    if (this.#deleteSelection()) {
      return;
    }

    if (this.#cursorPos > 0) {
      this.#value = this.#value.slice(0, this.#cursorPos - 1) + this.#value.slice(this.#cursorPos);
      this.#cursorPos--;
      this.#clampScrollOffset();
      this.dispatch('input', {value: this.#value});
    }
  }

  #handleDelete(): void {
    if (this.#deleteSelection()) {
      return;
    }

    if (this.#cursorPos < this.#value.length) {
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

  #handleEscape(): void {
    if (this.#selectionAnchor === undefined) {
      this.blur();
    } else {
      this.#selectionAnchor = undefined;
    }
  }
}

export function createInputWidget(options?: Partial<InputWidgetOptions>): InputWidget {
  return new InputWidget({...getDefaultInputOptions(), ...options});
}

export default InputWidget;
