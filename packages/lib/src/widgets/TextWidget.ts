import type {Pointer} from 'bun:ffi';
import type {
  TuiWidgetBorder,
  TuiWidgetColor,
  TuiWidgetRect,
  TuiWidgetShadow,
  TuiWidgetStyle,
  TuiWidgetText,
} from '../extern/widgets/types';
import {TuiEntity} from '../extern/widgets/TuiEntity';

export type TextWidgetOptions = TuiWidgetRect &
	TuiWidgetColor &
	TuiWidgetStyle &
	TuiWidgetBorder &
	TuiWidgetShadow &
	TuiWidgetText;

export class TextWidget extends TuiEntity {
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

export default TextWidget;
