import type {TuiWidgetEntity} from '../widgets/TuiWidgetEntity';
import type {PositionStrategy} from './PositionStrategy';

export type OverlayOptions = {
  positionStrategy?: PositionStrategy;
  shouldTrapFocus?: boolean;
  shouldShowBackdrop?: boolean;
  backdropRgba?: number;
};

export type OverlayHandle = {
  readonly widget: TuiWidgetEntity;
  close(): void;
  onClosed(callback: () => void): void;
};
