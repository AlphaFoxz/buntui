export type TabBarWidgetOptions = {
  rectX?: number;
  rectY?: number;
  rectWidth?: number;
  rectHeight?: number;
  tabs?: string[];
  value?: number;
  disabled?: boolean;

  // Normal (inactive tabs)
  colorFgNormal?: number;
  colorBgNormal?: number;

  // Active tab (when widget not focused)
  colorFgActive?: number;
  colorBgActive?: number;

  // Active tab when widget focused
  colorFgFocused?: number;
  colorBgFocused?: number;

  // Disabled
  colorFgDisabled?: number;
  colorBgDisabled?: number;

  // Separator between tabs
  colorFgSeparator?: number;
};
