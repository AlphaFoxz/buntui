import type {TuiColor} from '../../utils/color';
import type {
  TuiSizeValue,
  TuiBorderStyleName,
  TuiLayoutDirectionName,
  TuiLayoutAlignmentName,
  TuiJustifyContentName,
  TuiFlexWrapName,
  TuiAlignContentName,
} from '../types';

export type ScrollBoxWidgetOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  width?: TuiSizeValue;
  height?: TuiSizeValue;

  // Visual chrome (passed through to internal BoxWidget)
  colorFg?: TuiColor;
  colorBg?: TuiColor;
  colorBorder?: TuiColor;
  borderStyle?: TuiBorderStyleName;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  colorShadow?: TuiColor;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowCovered?: boolean;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  // Layout
  direction?: TuiLayoutDirectionName;
  gap?: number;
  align?: TuiLayoutAlignmentName;
  justifyContent?: TuiJustifyContentName;
  flexWrap?: TuiFlexWrapName;
  alignContent?: TuiAlignContentName;

  // Scroll behavior
  scrollSpeed?: number;
  alwaysShowScrollbar?: boolean;

  // Scrollbar visual
  colorScrollbar?: TuiColor;
  colorScrollbarTrack?: TuiColor;
};
