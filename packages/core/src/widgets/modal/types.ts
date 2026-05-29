import type {TuiColor} from '../../utils/color';

export type ModalWidgetOptions = {
  width?: number;
  height?: number;
  backdropRgba?: number;
  backdropColor?: TuiColor;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
};
