import type {KeyboardEvent} from '../events/types';
import type {Focusable} from './Focusable';
import {TuiWidgetEntity} from './TuiWidgetEntity';

export abstract class InteractiveWidget extends TuiWidgetEntity implements Focusable {
  static readonly #BLOCKED_WHEN_DISABLED = new Set([
    'click', 'mousedown', 'mouseup', 'mouseover', 'mousemove', 'contextmenu',
  ]);

  #focused = false;
  #disabled = false;
  #hovered = false;
  #tabIndex: number | undefined;

  constructor() {
    super();
    this.on('mouseover', () => {
      this.#hovered = true;
    });
    this.on('mouseout', () => {
      this.#hovered = false;
    });
  }

  get acceptsFocus(): boolean {
    return !this.#disabled;
  }

  get tabIndex(): number | undefined {
    return this.#tabIndex;
  }

  get focused(): boolean {
    return this.#focused;
  }

  get hovered(): boolean {
    return this.#hovered;
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
    this.#hovered = false;
    this.dispatch('blur', undefined);
  }

  setDisabled(value: boolean): void {
    this.#disabled = value;
    if (this.#disabled && this.#focused) {
      this.blur();
    }
  }

  setTabIndex(value: number | undefined): void {
    this.#tabIndex = value;
  }

  override dispatch(eventType: string, data: unknown): void {
    if (this.#disabled && InteractiveWidget.#BLOCKED_WHEN_DISABLED.has(eventType)) {
      return;
    }

    super.dispatch(eventType, data);
  }

  override unmounted(): void {
    if (this.#focused) {
      this.blur();
    }

    super.unmounted();
  }

  handleKey(event: KeyboardEvent): void {
    if (!this.acceptsFocus || event.key === undefined) {
      return;
    }

    this.dispatchKeyEvent(event);
    this.handleActiveKey(event);
  }

  abstract handleActiveKey(event: KeyboardEvent): void;
}
