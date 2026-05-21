import type {KeyboardEvent} from '../events/types';
import type {Focusable} from './Focusable';
import {TuiWidgetEntity} from './TuiWidgetEntity';

export abstract class InteractiveWidget extends TuiWidgetEntity implements Focusable {
  #focused = false;
  #disabled = false;
  #tabIndex: number | undefined;

  get acceptsFocus(): boolean {
    return !this.#disabled;
  }

  get tabIndex(): number | undefined {
    return this.#tabIndex;
  }

  get focused(): boolean {
    return this.#focused;
  }

  get disabled(): boolean {
    return this.#disabled;
  }

  focus(): void {
    this.#focused = true;
    this.dispatch('focus', undefined);
  }

  blur(): void {
    this.#focused = false;
    this.dispatch('blur', undefined);
  }

  setDisabled(value: boolean): void {
    this.#disabled = value;
  }

  setTabIndex(value: number | undefined): void {
    this.#tabIndex = value;
  }

  override unmounted(): void {
    if (this.#focused) {
      this.blur();
    }

    super.unmounted();
  }

  abstract handleKey(event: KeyboardEvent): void;
}
