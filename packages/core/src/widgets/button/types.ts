export type ButtonWidgetOptions = {
  rectX?: number;
  rectY?: number;
  rectWidth?: number;
  rectHeight?: number;
  text?: string;

  // Normal state
  colorFgNormal?: number;
  colorBgNormal?: number;
  borderColorNormal?: number;
  borderStyleNormal?: number;

  // Focused state
  colorFgFocused?: number;
  colorBgFocused?: number;
  borderColorFocused?: number;
  borderStyleFocused?: number;

  // Pressed state
  colorFgPressed?: number;
  colorBgPressed?: number;
  borderColorPressed?: number;
  borderStylePressed?: number;

  // Disabled state
  colorFgDisabled?: number;
  colorBgDisabled?: number;
  borderColorDisabled?: number;
  borderStyleDisabled?: number;

  disabled?: boolean;
};
