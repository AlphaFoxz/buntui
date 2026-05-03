import type {TuiColor} from '../../utils/color';

export type TabBarWidgetOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  tabs?: string[];
  value?: number;
  disabled?: boolean;

  // Normal (inactive tabs)
  colorFgNormal?: TuiColor;
  colorBgNormal?: TuiColor;

  // Active tab (when widget not focused)
  colorFgActive?: TuiColor;
  colorBgActive?: TuiColor;

  // Active tab when widget focused
  colorFgFocused?: TuiColor;
  colorBgFocused?: TuiColor;

  // Disabled
  colorFgDisabled?: TuiColor;
  colorBgDisabled?: TuiColor;

  // Separator between tabs
  colorFgSeparator?: TuiColor;
};
