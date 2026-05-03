import {type KeyboardEvent, TuiEventType} from '../events/types';
import {EVENT_BUS} from '../events';
import type {TuiWidgetEntity} from '../widgets/TuiWidgetEntity';
import type {Focusable} from '../widgets/Focusable';

export class FocusManager {
  #focusedWidget: (TuiWidgetEntity & Focusable) | undefined;
  #keyHandler: ((data: KeyboardEvent) => void) | undefined;

  start(onUnfocusedKey?: (event: KeyboardEvent) => void): void {
    this.#keyHandler = (data: KeyboardEvent) => {
      if (this.#focusedWidget) {
        this.#focusedWidget.handleKey(data);
        return;
      }

      onUnfocusedKey?.(data);
    };

    EVENT_BUS.on(TuiEventType.KeyboardEvent, this.#keyHandler);
  }

  stop(): void {
    if (this.#keyHandler) {
      EVENT_BUS.off(TuiEventType.KeyboardEvent, this.#keyHandler);
      this.#keyHandler = undefined;
    }

    this.blurWidget();
  }

  focusWidget(widget: TuiWidgetEntity & Focusable): void {
    if (widget === this.#focusedWidget) {
      return;
    }

    if (!widget.acceptsFocus) {
      return;
    }

    if (this.#focusedWidget) {
      this.#focusedWidget.blur();
    }

    this.#focusedWidget = widget;
    widget.focus();
  }

  blurWidget(): void {
    if (this.#focusedWidget) {
      this.#focusedWidget.blur();
      this.#focusedWidget = undefined;
    }
  }

  get focusedWidget() {
    return this.#focusedWidget;
  }
}
