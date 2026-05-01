export type CheckboxWidgetOptions = {
  rectX?: number;
  rectY?: number;
  rectWidth?: number;
  rectHeight?: number;
  label?: string;
  checked?: boolean;
  disabled?: boolean;

  // Normal state
  colorFgNormal?: number;
  colorBgNormal?: number;

  // Hovered state
  colorFgHovered?: number;
  colorBgHovered?: number;

  // Focused state (keyboard)
  colorFgFocused?: number;
  colorBgFocused?: number;

  // Disabled state
  colorFgDisabled?: number;
  colorBgDisabled?: number;
};
