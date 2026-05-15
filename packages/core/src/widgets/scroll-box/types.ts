import type {TuiColor} from '../../utils/color';
import type {TuiSizeValue, TuiBorderStyleName} from '../types';

export type ScrollBoxWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;

  // Visual chrome (passed through to internal BoxWidget)
  colorFg?: TuiColor;
  colorBg?: TuiColor;
  borderColor?: TuiColor;
  borderStyle?: TuiBorderStyleName;
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
