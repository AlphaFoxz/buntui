import type {TuiColor} from '../../utils/color';

export type ModalWidgetOptions = {
  width?: number;
  height?: number;
  backdropRgba?: number;
  backdropColor?: TuiColor;
  shouldCloseOnBackdrop?: boolean;
  shouldCloseOnEscape?: boolean;
};
