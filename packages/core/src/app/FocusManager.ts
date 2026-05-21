import {type KeyboardEvent, TuiEventType} from '../events/types';
import {EVENT_BUS} from '../events';
import type {TuiScene} from '../extern/app/TuiScene';
import type {TuiWidgetEntity} from '../widgets/TuiWidgetEntity';
import type {Focusable} from '../widgets/Focusable';

export class FocusManager {
  #focusedWidget: (TuiWidgetEntity & Focusable) | undefined;
  #keyHandler: ((data: KeyboardEvent) => void) | undefined;
  readonly #getScene: () => TuiScene | undefined;

  constructor(getScene: () => TuiScene | undefined) {
    this.#getScene = getScene;
  }

  start(onUnfocusedKey?: (event: KeyboardEvent) => void): void {
    this.#keyHandler = (data: KeyboardEvent) => {
      if (data.key === 'Tab' && !data.ctrlKey && !data.altKey && !data.metaKey) {
        this.#navigateFocus(data.shiftKey ? -1 : 1);
        return;
      }

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

  getFocusableWidgets(): ReadonlyArray<TuiWidgetEntity & Focusable> {
    return this.#getScene()?.getFocusableWidgets() ?? [];
  }

  #navigateFocus(direction: 1 | -1): void {
    const list = this.getFocusableWidgets();
    if (list.length === 0) {
      return;
    }

    if (!this.#focusedWidget) {
      this.focusWidget(direction === 1 ? list[0]! : list.at(-1)!);
      return;
    }

    const currentIndex = list.indexOf(this.#focusedWidget);
    if (currentIndex === -1) {
      this.focusWidget(direction === 1 ? list[0]! : list.at(-1)!);
      return;
    }

    const nextIndex = (currentIndex + direction + list.length) % list.length;
    this.focusWidget(list[nextIndex]!);
  }
}
