export type RadioGroupWidgetOptions = {
  rectX?: number;
  rectY?: number;
  rectWidth?: number;
  rectHeight?: number;
  options?: string[];
  value?: number;
  disabled?: boolean;

  // Normal state
  colorFgNormal?: number;
  colorBgNormal?: number;

  // Focused state
  colorFgFocused?: number;
  colorBgFocused?: number;

  // Disabled state
  colorFgDisabled?: number;
  colorBgDisabled?: number;

  // Selected item highlight
  colorFgSelected?: number;
  colorBgSelected?: number;
};
