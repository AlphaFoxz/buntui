import type {Pointer} from 'bun:ffi';
import type {
  TuiWidgetBorder,
  TuiWidgetColor,
  TuiWidgetRect,
  TuiWidgetShadow,
  TuiWidgetStyle,
  TuiWidgetText,
} from '../extern/widgets/types';
import {TuiWidgetEntity} from '../extern/widgets/TuiWidgetEntity';

export type TextWidgetOptions = TuiWidgetRect
	& TuiWidgetColor
	& TuiWidgetStyle
	& TuiWidgetBorder
	& TuiWidgetShadow
	& TuiWidgetText;

export class TextWidget extends TuiWidgetEntity {
  #text: string;

  constructor(options: TextWidgetOptions) {
    super();
    super.registerRectComponent({
      rectX: options.rectX,
      rectY: options.rectY,
      rectWidth: options.rectWidth,
      rectHeight: options.rectHeight,
    });
    super.registerColorComponent({
      colorFg: options.colorFg,
      colorBg: options.colorBg,
    });
    super.registerStyleComponent({
      styleZIndex: options.styleZIndex ?? 0,
      styleModifier: options.styleModifier ?? 0,
    });
    super.registerBorderComponent({
      borderColor: options.borderColor ?? 0xFF_FF_FF_FF,
      borderStyle: options.borderStyle ?? 0,
      borderTop: options.borderTop ?? false,
      borderRight: options.borderRight ?? false,
      borderBottom: options.borderBottom ?? false,
      borderLeft: options.borderLeft ?? false,
    });
    super.registerShadowComponent({
      shadowOffsetX: options.shadowOffsetX ?? 0,
      shadowOffsetY: options.shadowOffsetY ?? 0,
      shadowColor: options.shadowColor ?? 0,
      shadowCovered: options.shadowCovered ?? false,
    });
    this.#text = options.text;
    super.registerTextComponent();
  }

  get rect(): TuiWidgetRect {
    return super.fetchRectComponent()!;
  }

  updateRect(rect: Partial<TuiWidgetRect>) {
    super.updateRectComponent(rect);
  }

  get color(): TuiWidgetColor {
    return super.fetchColorComponent()!;
  }

  updateColor(color: Partial<TuiWidgetColor>) {
    super.updateColorComponent(color);
  }

  get style(): TuiWidgetStyle {
    return super.fetchStyleComponent()!;
  }

  updateStyle(style: Partial<TuiWidgetStyle>) {
    super.updateStyleComponent(style);
  }

  get border(): TuiWidgetBorder {
    return super.fetchBorderComponent()!;
  }

  updateBorder(border: Partial<TuiWidgetBorder>) {
    super.updateBorderComponent(border);
  }

  get shadow(): TuiWidgetShadow {
    return super.fetchShadowComponent()!;
  }

  updateShadow(shadow: Partial<TuiWidgetShadow>) {
    super.updateShadowComponent(shadow);
  }

  get text() {
    return this.#text;
  }

  updateText(text: string) {
    this.#text = text;
  }

  handleText(textPtr: Pointer) {
    super.updateTextPtr(textPtr);
  }
}

export const DEFAULT_TEXT_OPTIONS: TextWidgetOptions = {
  rectX: 0,
  rectY: 0,
  rectWidth: 0,
  rectHeight: 0,
  colorFg: 0xFF_FF_FF_FF,
  colorBg: 0x00_00_00_FF,
  styleZIndex: 0,
  styleModifier: 0,
  borderColor: 0xFF_FF_FF_FF,
  borderStyle: 0,
  borderTop: false,
  borderRight: false,
  borderBottom: false,
  borderLeft: false,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowColor: 0,
  shadowCovered: false,
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

