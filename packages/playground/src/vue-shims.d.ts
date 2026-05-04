declare module '*.vue' {
  export function setup(scene: unknown): void;
}

type TuiBoxProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  colorFg?: number;
  colorBg?: number;
  borderColor?: number;
  borderStyle?: number;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  styleZIndex?: number;
  styleModifier?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowColor?: number;
  shadowCovered?: boolean;
  draggable?: boolean;
  direction?: number;
  gap?: number;
  align?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
};

type TuiTextProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  colorFg?: number;
  colorBg?: number;
  styleZIndex?: number;
  styleModifier?: number;
  text?: string;
  overflow?: 'clip' | 'marquee';
  scrollSpeed?: number;
  scrollPauseMs?: number;
};

type TuiInputProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  colorFg?: number;
  colorBg?: number;
  placeholder?: string;
  value?: string;
  label?: string;
  borderColorUnfocused?: number;
  borderColorFocused?: number;
  borderStyle?: number;
  maxLength?: number;
  selectionBgColor?: number;
  selectionFgColor?: number;
};

type TuiButtonProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  disabled?: boolean;
  colorFgNormal?: number;
  colorBgNormal?: number;
  borderColorNormal?: number;
  borderStyleNormal?: number;
  colorFgFocused?: number;
  colorBgFocused?: number;
  borderColorFocused?: number;
  borderStyleFocused?: number;
  colorFgPressed?: number;
  colorBgPressed?: number;
  borderColorPressed?: number;
  borderStylePressed?: number;
  colorFgDisabled?: number;
  colorBgDisabled?: number;
  borderColorDisabled?: number;
  borderStyleDisabled?: number;
};

type TuiCheckboxProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  colorFgNormal?: number;
  colorBgNormal?: number;
  colorFgHovered?: number;
  colorBgHovered?: number;
  colorFgFocused?: number;
  colorBgFocused?: number;
  colorFgDisabled?: number;
  colorBgDisabled?: number;
};

type TuiRadioGroupProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  options?: string[];
  value?: number;
  disabled?: boolean;
  colorFgNormal?: number;
  colorBgNormal?: number;
  colorFgFocused?: number;
  colorBgFocused?: number;
  colorFgDisabled?: number;
  colorBgDisabled?: number;
  colorFgSelected?: number;
  colorBgSelected?: number;
};

type TuiSelectButtonProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  options?: unknown[];
  value?: unknown;
  disabled?: boolean;
  colorFgNormal?: number;
  colorBgNormal?: number;
  colorFgActive?: number;
  colorBgActive?: number;
  colorFgFocused?: number;
  colorBgFocused?: number;
  colorFgDisabled?: number;
  colorBgDisabled?: number;
  colorFgSeparator?: number;
};

type TuiSwitchProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  colorFgNormal?: number;
  colorBgNormal?: number;
  colorCrossNormal?: number;
  colorCheckNormal?: number;
  colorDimNormal?: number;
  colorFgHovered?: number;
  colorBgHovered?: number;
  colorCrossHovered?: number;
  colorCheckHovered?: number;
  colorDimHovered?: number;
  colorFgFocused?: number;
  colorBgFocused?: number;
  colorCrossFocused?: number;
  colorCheckFocused?: number;
  colorDimFocused?: number;
  colorFgDisabled?: number;
  colorBgDisabled?: number;
  colorCrossDisabled?: number;
  colorCheckDisabled?: number;
  colorDimDisabled?: number;
};

type TuiFrameRateWatcherProps = TuiBoxProps;

declare global {
  namespace JSX {
    type IntrinsicElements = {
      Box: TuiBoxProps;
      Text: TuiTextProps;
      Input: TuiInputProps;
      Button: TuiButtonProps;
      Checkbox: TuiCheckboxProps;
      RadioGroup: TuiRadioGroupProps;
      SelectButton: TuiSelectButtonProps;
      Switch: TuiSwitchProps;
      FrameRateWatcher: TuiFrameRateWatcherProps;
    };
  }
}
