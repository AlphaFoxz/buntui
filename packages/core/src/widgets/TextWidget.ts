import type {
  TuiWidgetBorder,
  TuiWidgetColor,
  TuiWidgetRect,
  TuiWidgetShadow,
  TuiWidgetStyle,
  TuiWidgetText,
} from '../extern/widgets/types';
import {TuiWidgetEntity} from '../extern/widgets/TuiWidgetEntity';
import type {DrawListBuffer} from '../draw_list/DrawListBuffer';
import {BorderSides} from '../draw_list/types';

export type TextWidgetOptions = TuiWidgetRect
  & TuiWidgetColor
  & Partial<TuiWidgetStyle>
  & Partial<TuiWidgetBorder>
  & Partial<TuiWidgetShadow>
  & TuiWidgetText;

export class TextWidget extends TuiWidgetEntity {
  readonly #rect: TuiWidgetRect;
  readonly #color: TuiWidgetColor;
  readonly #style: TuiWidgetStyle;
  readonly #border: TuiWidgetBorder;
  readonly #shadow: TuiWidgetShadow;
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
    this.#border = {
      borderColor: options.borderColor ?? 0xFF_FF_FF_FF,
      borderStyle: options.borderStyle ?? 0,
      borderTop: options.borderTop ?? false,
      borderRight: options.borderRight ?? false,
      borderBottom: options.borderBottom ?? false,
      borderLeft: options.borderLeft ?? false,
    };
    this.#shadow = {
      shadowOffsetX: options.shadowOffsetX ?? 0,
      shadowOffsetY: options.shadowOffsetY ?? 0,
      shadowColor: options.shadowColor ?? 0,
      shadowCovered: options.shadowCovered ?? false,
    };
    this.#text = options.text;
  }

  get rect(): TuiWidgetRect {
    return this.#rect;
  }

  updateRect(rect: Partial<TuiWidgetRect>) {
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

  get border(): TuiWidgetBorder {
    return this.#border;
  }

  updateBorder(border: Partial<TuiWidgetBorder>) {
    Object.assign(this.#border, border);
  }

  get shadow(): TuiWidgetShadow {
    return this.#shadow;
  }

  updateShadow(shadow: Partial<TuiWidgetShadow>) {
    Object.assign(this.#shadow, shadow);
  }

  override get zIndex(): number {
    return this.#style.styleZIndex;
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
    const {borderColor, borderStyle, borderTop, borderRight, borderBottom, borderLeft} = this.#border;

    buffer.pushClip(rectX, rectY, rectWidth, rectHeight);

    // Background fill
    buffer.drawRect({
      x: rectX,
      y: rectY,
      width: rectWidth,
      height: rectHeight,
      bgRgba: colorBg,
    });

    // Text content — offset by border insets so border doesn't overwrite text
    if (this.#text.length > 0) {
      const textX = rectX + (borderLeft ? 1 : 0);
      const textY = rectY + (borderTop ? 1 : 0);
      buffer.drawText({
        x: textX,
        y: textY,
        text: this.#text,
        fgRgba: colorFg,
        bgRgba: colorBg,
      });
    }

    // Border
    if (borderStyle !== 0) {
      const sides = (borderTop ? BorderSides.Top : 0)
        | (borderRight ? BorderSides.Right : 0)
        | (borderBottom ? BorderSides.Bottom : 0)
        | (borderLeft ? BorderSides.Left : 0);
      buffer.drawBorder({
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight,
        colorRgba: borderColor,
        style: borderStyle,
        sides,
      });
    }

    buffer.popClip();
  }
}

export const DEFAULT_TEXT_OPTIONS: TextWidgetOptions = {
  rectX: 0,
  rectY: 0,
  rectWidth: 0,
  rectHeight: 0,
  colorFg: 0xFF_FF_FF_FF,
  colorBg: 0x00_00_00_FF,
  text: '',
};

export function createText(options: Partial<TextWidgetOptions> & {text: string}): TextWidget;
export function createText(text: string): TextWidget;
export function createText(options: string | (Partial<TextWidgetOptions> & {text: string})) {
  if (typeof options === 'string') {
    return new TextWidget({...DEFAULT_TEXT_OPTIONS, text: options});
  }

  return new TextWidget({
    ...DEFAULT_TEXT_OPTIONS,
    ...options,
  });
}

export default TextWidget;
