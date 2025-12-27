import TextWidget, {type TextWidgetOptions} from './TextWidget';

const DEFAULT_TEXT_OPTIONS: TextWidgetOptions = {
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
export function createText(parameter: string | (Partial<TextWidgetOptions> & {text: string})) {
  if (typeof parameter === 'string') {
    return new TextWidget({...DEFAULT_TEXT_OPTIONS, text: parameter});
  }

  return new TextWidget({
    // Rect
    rectX: parameter.rectX ?? DEFAULT_TEXT_OPTIONS.rectX,
    rectY: parameter.rectY ?? DEFAULT_TEXT_OPTIONS.rectY,
    rectWidth: parameter.rectWidth ?? DEFAULT_TEXT_OPTIONS.rectWidth,
    rectHeight: parameter.rectHeight ?? DEFAULT_TEXT_OPTIONS.rectHeight,
    // Color
    colorFg: parameter.colorFg ?? DEFAULT_TEXT_OPTIONS.colorFg,
    colorBg: parameter.colorBg ?? DEFAULT_TEXT_OPTIONS.colorBg,
    // Style
    styleZIndex: parameter.styleZIndex ?? DEFAULT_TEXT_OPTIONS.styleZIndex,
    styleModifier: parameter.styleModifier ?? DEFAULT_TEXT_OPTIONS.styleModifier,
    // Border
    borderColor: parameter.borderColor ?? DEFAULT_TEXT_OPTIONS.borderColor,
    borderStyle: parameter.borderStyle ?? DEFAULT_TEXT_OPTIONS.borderStyle,
    borderTop: parameter.borderTop ?? DEFAULT_TEXT_OPTIONS.borderTop,
    borderRight: parameter.borderRight ?? DEFAULT_TEXT_OPTIONS.borderRight,
    borderBottom: parameter.borderBottom ?? DEFAULT_TEXT_OPTIONS.borderBottom,
    borderLeft: parameter.borderLeft ?? DEFAULT_TEXT_OPTIONS.borderLeft,
    // Shadow
    shadowOffsetX: parameter.shadowOffsetX ?? DEFAULT_TEXT_OPTIONS.shadowOffsetX,
    shadowOffsetY: parameter.shadowOffsetY ?? DEFAULT_TEXT_OPTIONS.shadowOffsetY,
    shadowColor: parameter.shadowColor ?? DEFAULT_TEXT_OPTIONS.shadowColor,
    shadowCovered: parameter.shadowCovered ?? DEFAULT_TEXT_OPTIONS.shadowCovered,
    // Text
    text: parameter.text,
  });
}

