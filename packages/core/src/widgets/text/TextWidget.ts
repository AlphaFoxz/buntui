import {stringDisplayWidth, truncateToWidth, charDisplayWidth} from '../../utils/string-width';
import {parseColor, type TuiColor} from '../../utils/color';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {getTheme} from '../../theme/provider';
import {extractPercentSpec, isPercent} from '../../utils/percent';
import {
  type TuiSizeValue,
  type TuiWidgetColor,
  type TuiWidgetRect,
  type TuiWidgetSize,
  type TuiWidgetStyle,
  type TuiWidgetText,
  type TuiFontStyleInput,
  resolveFontStyle,
} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {TextOverflow} from './types';

export type TextWidgetOptions = Omit<TuiWidgetColor & TuiWidgetText, 'colorFg' | 'colorBg'>
  & {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    colorFg?: TuiColor;
    colorBg?: TuiColor;
    overflow?: TextOverflow;
    scrollSpeed?: number;
    scrollPauseMs?: number;
    styleModifier?: TuiFontStyleInput;
    styleZIndex?: I16;
  };

export class TextWidget extends TuiWidgetEntity {
  readonly #rect: TuiWidgetRect;
  readonly #color: TuiWidgetColor;
  readonly #style: TuiWidgetStyle;
  #value: string;

  readonly #overflow: TextOverflow;
  readonly #scrollSpeed: number;
  readonly #scrollPauseMs: number;
  #scrollOffset = 0;
  #pauseRemaining = 0;
  #waitingReset = false;
  #lastTimestamp = 0;
  #firstRender = true;

  constructor(options: TextWidgetOptions) {
    super();
    const spec = extractPercentSpec(options.x, options.y, options.width, options.height);
    if (spec) {
      this.setPercentSpec(spec);
    }

    this.#rect = {
      x: isPercent(options.x) ? 0 : (options.x ?? 0),
      y: isPercent(options.y) ? 0 : (options.y ?? 0),
      width: isPercent(options.width) ? 0 : (options.width ?? 32),
      height: isPercent(options.height) ? 0 : (options.height ?? 1),
    };
    const theme = getTheme();
    this.#color = {
      colorFg: parseColor(options.colorFg ?? theme.colors.text),
      colorBg: parseColor(options.colorBg ?? 0x00_00_00_00),
    };
    this.#style = {
      styleZIndex: options.styleZIndex ?? 0,
      styleModifier: resolveFontStyle(options.styleModifier),
    };
    this.#value = options.value;
    this.#overflow = options.overflow ?? 'marquee';
    this.#scrollSpeed = options.scrollSpeed ?? 4;
    this.#scrollPauseMs = options.scrollPauseMs ?? 1000;
  }

  override get rect(): TuiWidgetRect {
    return this.#rect;
  }

  override updateRect(rect: Partial<TuiWidgetRect>) {
    Object.assign(this.#rect, rect);
  }

  get color(): TuiWidgetColor {
    return this.#color;
  }

  updateColor(color: Partial<TuiWidgetColor>) {
    if (color.colorFg !== undefined) {
      this.#color.colorFg = parseColor(color.colorFg);
    }

    if (color.colorBg !== undefined) {
      this.#color.colorBg = parseColor(color.colorBg);
    }
  }

  get style(): TuiWidgetStyle {
    return this.#style;
  }

  updateStyle(style: Omit<Partial<TuiWidgetStyle>, 'styleModifier'> & {styleModifier?: TuiFontStyleInput}) {
    if (style.styleModifier !== undefined) {
      this.#style.styleModifier = resolveFontStyle(style.styleModifier);
    }

    if (style.styleZIndex !== undefined) {
      this.#style.styleZIndex = style.styleZIndex;
    }
  }

  override get zIndex(): number {
    return this.#style.styleZIndex;
  }

  get value() {
    return this.#value;
  }

  updateValue(value: string) {
    this.#value = value;
    this.#scrollOffset = 0;
    this.#pauseRemaining = 0;
    this.#waitingReset = false;
    this.#firstRender = true;
  }

  override intrinsicSize(): TuiWidgetSize | undefined {
    return {
      width: stringDisplayWidth(this.#value),
      height: 1,
    };
  }

  override unmounted(): void {
    super.unmounted();
    this.#lastTimestamp = 0;
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const {x, y, width, height} = this.#rect;
    const {colorFg, colorBg} = this.#color;

    buffer.pushClip(x, y, width, height);

    // Optional background fill
    if (colorBg !== 0x00_00_00_00) {
      buffer.drawRect({
        x,
        y,
        width,
        height,
        bgRgba: colorBg,
      });
    }

    // Text content
    if (this.#value.length > 0) {
      if (this.#overflow === 'marquee') {
        this.#drawMarquee(buffer, {
          x,
          y,
          visibleWidth: width,
          fgRgba: colorFg,
        });
      } else {
        buffer.drawText({
          x,
          y,
          text: this.#value,
          fgRgba: colorFg,
          bgRgba: 0x00_00_00_00,
        });
      }
    }

    buffer.popClip();
  }

  #drawMarquee(
    buffer: DrawListBuffer,
    {x, y, visibleWidth, fgRgba}: {
      x: number;
      y: number;
      visibleWidth: number;
      fgRgba: number;
    },
  ): void {
    const textWidth = stringDisplayWidth(this.#value);
    if (textWidth <= visibleWidth) {
      buffer.drawText({
        x,
        y,
        text: this.#value,
        fgRgba,
        bgRgba: 0x00_00_00_00,
      });
      return;
    }

    // Advance animation
    const now = Date.now();
    if (this.#lastTimestamp === 0) {
      this.#lastTimestamp = now;
    }

    const deltaMs = now - this.#lastTimestamp;
    this.#lastTimestamp = now;

    if (this.#firstRender) {
      this.#firstRender = false;
      this.#pauseRemaining = this.#scrollPauseMs;
    }

    // Calculate maxOffset: ensure scroll reaches far enough to fully display tail characters
    let tailWidth = 0;
    const chars = [...this.#value];
    for (let i = chars.length - 1; i >= 0; i--) {
      const char = chars[i]!;
      const cw = charDisplayWidth(char);
      if (tailWidth + cw > visibleWidth) {
        break;
      }

      tailWidth += cw;
    }

    const maxOffset = Math.max(textWidth - visibleWidth, textWidth - tailWidth);

    if (this.#pauseRemaining > 0) {
      this.#pauseRemaining -= deltaMs;
      if (this.#pauseRemaining < 0) {
        this.#pauseRemaining = 0;
        if (this.#waitingReset) {
          this.#waitingReset = false;
          this.#scrollOffset = 0;
          this.#pauseRemaining = this.#scrollPauseMs;
        }
      }
    } else {
      const deltaOffset = (this.#scrollSpeed * deltaMs) / 1000;
      this.#scrollOffset += deltaOffset;

      if (this.#scrollOffset >= maxOffset) {
        this.#scrollOffset = maxOffset;
        this.#pauseRemaining = this.#scrollPauseMs;
        this.#waitingReset = true;
      }
    }

    // Cell-aligned scroll for consistent speed
    const cellOffset = Math.floor(this.#scrollOffset);

    // Find first character not fully scrolled off the left edge
    let charStart = 0;
    let posBefore = 0;
    for (const char of this.#value) {
      const cw = charDisplayWidth(char);
      if (posBefore + cw > cellOffset) {
        break;
      }

      posBefore += cw;
      charStart++;
    }

    // Calculate how many cells are available from the draw position to the right clip edge
    const cellsFromDraw = visibleWidth - (posBefore - cellOffset);
    const visibleText = truncateToWidth(this.#value.slice(charStart), cellsFromDraw);

    const drawX = x + posBefore - cellOffset;

    buffer.drawText({
      x: drawX,
      y,
      text: visibleText,
      fgRgba,
      bgRgba: 0x00_00_00_00,
    });
  }
}

export const DEFAULT_TEXT_OPTIONS: TextWidgetOptions = {
  x: 0,
  y: 0,
  width: 32,
  height: 1,
  colorFg: 0xFF_FF_FF_FF,
  colorBg: 0x00_00_00_00,
  value: '',
};

export function createTextWidget(options: Partial<TextWidgetOptions> & {value: string}): TextWidget;
export function createTextWidget(value: string): TextWidget;
export function createTextWidget(options: string | (Partial<TextWidgetOptions> & {value: string})) {
  if (typeof options === 'string') {
    return new TextWidget({...DEFAULT_TEXT_OPTIONS, value: options});
  }

  return new TextWidget({
    ...DEFAULT_TEXT_OPTIONS,
    ...options,
  });
}

export default TextWidget;
