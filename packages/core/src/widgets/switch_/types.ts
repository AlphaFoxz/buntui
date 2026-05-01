export type SwitchWidgetOptions = {
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
  colorCrossNormal?: number;
  colorCheckNormal?: number;
  colorDimNormal?: number;

  // Hovered state
  colorFgHovered?: number;
  colorBgHovered?: number;
  colorCrossHovered?: number;
  colorCheckHovered?: number;
  colorDimHovered?: number;

  // Focused state (keyboard)
  colorFgFocused?: number;
  colorBgFocused?: number;
  colorCrossFocused?: number;
  colorCheckFocused?: number;
  colorDimFocused?: number;

  // Disabled state
  colorFgDisabled?: number;
  colorBgDisabled?: number;
  colorCrossDisabled?: number;
  colorCheckDisabled?: number;
  colorDimDisabled?: number;
};
