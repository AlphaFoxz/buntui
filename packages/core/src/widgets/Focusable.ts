import type {KeyboardEvent} from '../events/types';
import type {TuiWidgetEntity} from './TuiWidgetEntity';

export type Focusable = {
  readonly acceptsFocus: boolean;
  readonly tabIndex?: number;
  focus(): void;
  blur(): void;
  handleKey(event: KeyboardEvent): void;
};

export function isFocusable(widget: TuiWidgetEntity): widget is TuiWidgetEntity & Focusable {
  return 'handleKey' in widget && 'focus' in widget && 'blur' in widget && 'acceptsFocus' in widget;
}
