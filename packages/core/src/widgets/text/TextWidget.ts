import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {
  TuiWidgetColor,
  TuiWidgetRect,
  TuiWidgetStyle,
  TuiWidgetText,
} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';

export type TextWidgetOptions = TuiWidgetRect
  & TuiWidgetColor
  & Partial<TuiWidgetStyle>
  & TuiWidgetText;

export class TextWidget extends TuiWidgetEntity {
  readonly #rect: TuiWidgetRect;
  readonly #color: TuiWidgetColor;
  readonly #style: TuiWidgetStyle;
  #text: string;

  constructor(options: TextWidgetOptions) {
    super();
    this.#rect = {
      rectX: options.rectX,
      rectY: options.rectY,
      rectWidth: options.rectWidth,
      rectHeight: options.rectHeight,
    };
    this.#color = {
      colorFg: options.colorFg,
      colorBg: options.colorBg,
    };
    this.#style = {
      styleZIndex: options.styleZIndex ?? 0,
      styleModifier: options.styleModifier ?? 0,
    };
    this.#text = options.text;
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
    Object.assign(this.#color, color);
  }

  get style(): TuiWidgetStyle {
    return this.#style;
  }

  updateStyle(style: Partial<TuiWidgetStyle>) {
    Object.assign(this.#style, style);
  }

  override get zIndex(): number {
    return this.#style.styleZIndex;
  }

  override containsPoint(x: number, y: number): boolean {
    const {rectX, rectY, rectWidth, rectHeight} = this.#rect;
    return x >= rectX && x < rectX + rectWidth && y >= rectY && y < rectY + rectHeight;
  }

  get text() {
    return this.#text;
  }

  updateText(text: string) {
    this.#text = text;
  }

  override emitDrawCommands(buffer: DrawListBuffer): void {
    const {rectX, rectY, rectWidth, rectHeight} = this.#rect;
    const {colorFg, colorBg} = this.#color;

    buffer.pushClip(rectX, rectY, rectWidth, rectHeight);

    // Optional background fill
    if (colorBg !== 0x00_00_00_00) {
      buffer.drawRect({
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight,
        bgRgba: colorBg,
      });
    }

    // Text content
    if (this.#text.length > 0) {
      buffer.drawText({
        x: rectX,
        y: rectY,
        text: this.#text,
        fgRgba: colorFg,
        bgRgba: 0x00_00_00_00,
      });
    }

    buffer.popClip();
  }
}

export const DEFAULT_TEXT_OPTIONS: TextWidgetOptions = {
  rectX: 0 as U16,
  rectY: 0 as U16,
  rectWidth: 0 as U16,
  rectHeight: 0 as U16,
  colorFg: 0xFF_FF_FF_FF as U32,
  colorBg: 0x00_00_00_00 as U32,
  text: '',
};

export function createTextWidget(options: Partial<TextWidgetOptions> & {text: string}): TextWidget;
export function createTextWidget(text: string): TextWidget;
export function createTextWidget(options: string | (Partial<TextWidgetOptions> & {text: string})) {
  if (typeof options === 'string') {
    return new TextWidget({...DEFAULT_TEXT_OPTIONS, text: options});
  }

  return new TextWidget({
    ...DEFAULT_TEXT_OPTIONS,
    ...options,
  });
}

export default TextWidget;
