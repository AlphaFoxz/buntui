import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent, type MouseEvent} from '../../events/types';
import {BorderSides, CursorMode} from '../../draw_list/types';
import type {TuiWidgetRect} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {Focusable} from '../Focusable';
import type {InputWidgetOptions} from './types';

function charDisplayWidth(char: string): number {
  const code = char.codePointAt(0)!;
  if (code < 0x20 || code === 0x7F) {
    return 0;
  }

  if ((code >= 0x4E_00 && code <= 0x9F_FF)
    || (code >= 0x34_00 && code <= 0x4D_BF)
    || (code >= 0x30_00 && code <= 0x30_3F)
    || (code >= 0x30_40 && code <= 0x30_9F)
    || (code >= 0x30_A0 && code <= 0x30_FF)
    || (code >= 0xAC_00 && code <= 0xD7_AF)
    || (code >= 0xFF_01 && code <= 0xFF_60)
    || (code >= 0xF9_00 && code <= 0xFA_FF)
    || (code >= 0x2E_80 && code <= 0x2F_DF)
    || (code >= 0x31_00 && code <= 0x31_8F)
    || (code >= 0x32_00 && code <= 0x33_FF)
    || (code >= 0xFE_30 && code <= 0xFE_4F)
    || (code >= 0x26_00 && code <= 0x27_BF)
    || (code >= 0x1_F3_00 && code <= 0x1_F9_FF)) {
    return 2;
  }

  return 1;
}

function stringDisplayWidth(string_: string): number {
  let width = 0;
  for (const char of string_) {
    width += charDisplayWidth(char);
  }

  return width;
}

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

function truncateToWidth(string_: string, maxWidth: number): string {
  let width = 0;
  let index = 0;
  for (const char of string_) {
    const cw = charDisplayWidth(char);
    if (width + cw > maxWidth) {
      break;
    }

    width += cw;
    index++;
  }

  return string_.slice(0, index);
}

const DEFAULT_INPUT_OPTIONS: InputWidgetOptions = {
  rectX: 0,
  rectY: 0,
  rectWidth: 20,
  rectHeight: 3,
  placeholder: '',
  value: '',
  colorFg: 0xFF_FF_FF_FF,
  colorBg: 0x1E_1E_2E_FF,
  borderColorUnfocused: 0x45_47_5A_FF,
  borderColorFocused: 0x89_B4_FA_FF,
  borderStyle: 1,
  maxLength: 0,
  selectionBgColor: 0x26_4F_78_FF,
  selectionFgColor: 0xFF_FF_FF_FF,
};

export class InputWidget extends TuiWidgetEntity implements Focusable {
  #rectX: number;
  #rectY: number;
  #rectWidth: number;
  #rectHeight: number;

  readonly #colorFg: number;
  readonly #colorBg: number;
  readonly #borderColorUnfocused: number;
  readonly #borderColorFocused: number;
  readonly #borderStyle: number;
  readonly #maxLength: number;
  readonly #placeholder: string;
  readonly #selectionBgColor: number;
  readonly #selectionFgColor: number;

  #value: string;
  #cursorPos = 0;
  #focused = false;
  #scrollOffset = 0;
  #selectionAnchor: number | undefined;

  constructor(options: InputWidgetOptions = {}) {
    super();
    const resolved = {...DEFAULT_INPUT_OPTIONS, ...options};
    this.#rectX = resolved.rectX ?? 0;
    this.#rectY = resolved.rectY ?? 0;
    this.#rectWidth = resolved.rectWidth ?? 20;
    this.#rectHeight = resolved.rectHeight ?? 3;
    this.#colorFg = resolved.colorFg ?? 0xFF_FF_FF_FF;
    this.#colorBg = resolved.colorBg ?? 0x1E_1E_2E_FF;
    this.#borderColorUnfocused = resolved.borderColorUnfocused ?? 0x45_47_5A_FF;
    this.#borderColorFocused = resolved.borderColorFocused ?? 0x89_B4_FA_FF;
    this.#borderStyle = resolved.borderStyle ?? 1;
    this.#maxLength = resolved.maxLength ?? 0;
    this.#placeholder = resolved.placeholder ?? '';
    this.#selectionBgColor = resolved.selectionBgColor ?? 0x26_4F_78_FF;
    this.#selectionFgColor = resolved.selectionFgColor ?? 0xFF_FF_FF_FF;
    this.#value = resolved.value ?? '';
    this.#cursorPos = this.#value.length;

    this.on('mousedown', (data: unknown) => {
      // eslint-disable-next-line
      const mouseData = data as MouseEvent;
      const innerX = (mouseData.x - 1) - this.#rectX - 1;
      const textFromScroll = this.#value.slice(this.#scrollOffset);
      const targetPos = Math.max(0, Math.min(this.#value.length, this.#scrollOffset + charIndexAtColumn(textFromScroll, innerX)));

      if (mouseData.shiftKey) {
        if (this.#selectionAnchor === undefined) {
          this.#selectionAnchor = this.#cursorPos;
        }
      } else {
        this.#selectionAnchor = undefined;
      }

      this.#cursorPos = targetPos;
      this.#clampScrollOffset();
    });
  }

  get value(): string {
    return this.#value;
  }

  setValue(newValue: string): void {
    this.#value = newValue;
    this.#cursorPos = Math.min(this.#cursorPos, this.#value.length);
    this.#selectionAnchor = undefined;
    this.#clampScrollOffset();
  }

  get acceptsFocus(): boolean {
    return true;
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
    if (event.key === undefined) {
      return;
    }

    // Printable character
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (this.#maxLength === 0 || this.#value.length < this.#maxLength || this.#getSelectionRange() !== undefined) {
        this.#deleteSelection();
        if (this.#maxLength === 0 || this.#value.length < this.#maxLength) {
          this.#value = this.#value.slice(0, this.#cursorPos) + event.key + this.#value.slice(this.#cursorPos);
          this.#cursorPos++;
        }

        this.#clampScrollOffset();
        this.dispatch('input', {value: this.#value});
      }

      return;
    }

    switch (event.key) {
      case 'Backspace': {
        if (this.#deleteSelection()) {
          break;
        }

        if (this.#cursorPos > 0) {
          this.#value = this.#value.slice(0, this.#cursorPos - 1) + this.#value.slice(this.#cursorPos);
          this.#cursorPos--;
          this.#clampScrollOffset();
          this.dispatch('input', {value: this.#value});
        }

        break;
      }

      case 'Delete': {
        if (this.#deleteSelection()) {
          break;
        }

        if (this.#cursorPos < this.#value.length) {
          this.#value = this.#value.slice(0, this.#cursorPos) + this.#value.slice(this.#cursorPos + 1);
          this.#clampScrollOffset();
          this.dispatch('input', {value: this.#value});
        }

        break;
      }

      case 'ArrowLeft': {
        if (event.shiftKey) {
          if (this.#selectionAnchor === undefined) {
            this.#selectionAnchor = this.#cursorPos;
          }
        } else {
          this.#selectionAnchor = undefined;
        }

        if (this.#cursorPos > 0) {
          this.#cursorPos--;
          this.#clampScrollOffset();
        }

        break;
      }

      case 'ArrowRight': {
        if (event.shiftKey) {
          if (this.#selectionAnchor === undefined) {
            this.#selectionAnchor = this.#cursorPos;
          }
        } else {
          this.#selectionAnchor = undefined;
        }

        if (this.#cursorPos < this.#value.length) {
          this.#cursorPos++;
          this.#clampScrollOffset();
        }

        break;
      }

      case 'Home': {
        if (event.shiftKey) {
          if (this.#selectionAnchor === undefined) {
            this.#selectionAnchor = this.#cursorPos;
          }
        } else {
          this.#selectionAnchor = undefined;
        }

        this.#cursorPos = 0;
        this.#scrollOffset = 0;
        break;
      }

      case 'End': {
        if (event.shiftKey) {
          if (this.#selectionAnchor === undefined) {
            this.#selectionAnchor = this.#cursorPos;
          }
        } else {
          this.#selectionAnchor = undefined;
        }

        this.#cursorPos = this.#value.length;
        this.#clampScrollOffset();
        break;
      }

      case 'a': {
        if (event.ctrlKey && !event.altKey && !event.metaKey) {
          if (this.#value.length > 0) {
            this.#selectionAnchor = 0;
            this.#cursorPos = this.#value.length;
            this.#clampScrollOffset();
          }
        }

        break;
      }

      case 'Escape': {
        if (this.#selectionAnchor !== undefined) {
          this.#selectionAnchor = undefined;
        } else {
          this.blur();
        }

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
    if (this.#rectWidth <= 0 || this.#rectHeight <= 0) {
      return;
    }

    buffer.pushClip(this.#rectX, this.#rectY, this.#rectWidth, this.#rectHeight);

    // Background
    buffer.drawRect({
      x: this.#rectX,
      y: this.#rectY,
      width: this.#rectWidth,
      height: this.#rectHeight,
      bgRgba: this.#colorBg,
    });

    // Text content or placeholder
    const textX = this.#rectX + 1;
    const textY = this.#rectY + 1;
    const visibleWidth = this.#rectWidth - 2;

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
        x: this.#rectX,
        y: this.#rectY,
        width: this.#rectWidth,
        height: this.#rectHeight,
        colorRgba: borderColor,
        style: this.#borderStyle,
        sides: BorderSides.All,
      });
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
      rectX: this.#rectX,
      rectY: this.#rectY,
      rectWidth: this.#rectWidth,
      rectHeight: this.#rectHeight,
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
    const visibleWidth = this.#rectWidth - 2;
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
}

export function createInputWidget(options?: Partial<InputWidgetOptions>): InputWidget {
  return new InputWidget({...DEFAULT_INPUT_OPTIONS, ...options});
}

export default InputWidget;
