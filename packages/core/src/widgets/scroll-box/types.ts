import type {TuiColor} from '../../utils/color';

export type ScrollBoxWidgetOptions = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;

  // Visual chrome (passed through to internal BoxWidget)
  colorFg?: TuiColor;
  colorBg?: TuiColor;
  borderColor?: TuiColor;
  borderStyle?: number;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  shadowColor?: TuiColor;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowCovered?: boolean;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  // Scroll behavior
  gap?: number;
  scrollSpeed?: number;
  alwaysShowScrollbar?: boolean;

  // Scrollbar visual
  scrollbarColor?: TuiColor;
  scrollbarTrackColor?: TuiColor;
};
