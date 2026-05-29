import {type KeyboardEvent, TuiEventType} from '../events/types';
import {EVENT_BUS} from '../events';
import type {TuiScene} from '../extern/app/TuiScene';
import type {TuiWidgetEntity} from '../widgets/TuiWidgetEntity';
import type {Focusable} from '../widgets/Focusable';
import {InteractiveWidget} from '../widgets/InteractiveWidget';
import {ScrollBoxWidget} from '../widgets/scroll-box/ScrollBoxWidget';

export class FocusManager {
  #focusedWidget: (TuiWidgetEntity & Focusable) | undefined;
  #keyHandler: ((data: KeyboardEvent) => void) | undefined;
  readonly #getScene: () => TuiScene | undefined;
  readonly #focusScopeStack: TuiWidgetEntity[] = [];

  constructor(getScene: () => TuiScene | undefined) {
    this.#getScene = getScene;
  }

  start(onUnfocusedKey?: (event: KeyboardEvent) => void): void {
    InteractiveWidget.setFocusRequestCallback(widget => {
      this.focusWidget(widget);
    });

    this.#keyHandler = (data: KeyboardEvent) => {
      if (this.#focusedWidget && !this.#focusedWidget.acceptsFocus) {
        this.#focusedWidget = undefined;
      }

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
    InteractiveWidget.setFocusRequestCallback(undefined);

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
    this.#scrollIntoView(widget);
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
    const all = this.#getScene()?.getFocusableWidgets() ?? [];
    if (this.#focusScopeStack.length === 0) {
      return all;
    }

    const scopeRoot = this.#focusScopeStack.at(-1)!;
    return all.filter(w => this.#isDescendantOf(w, scopeRoot));
  }

  pushFocusScope(scopeRoot: TuiWidgetEntity): void {
    this.#focusScopeStack.push(scopeRoot);
  }

  popFocusScope(): void {
    this.#focusScopeStack.pop();
  }

  #isDescendantOf(widget: TuiWidgetEntity, ancestor: TuiWidgetEntity): boolean {
    let current: TuiWidgetEntity | null = widget;
    while (current) {
      if (current === ancestor) {
        return true;
      }

      current = current.parent;
    }

    return false;
  }

  #scrollIntoView(widget: TuiWidgetEntity): void {
    let ancestor = widget.parent;
    while (ancestor) {
      if (ancestor instanceof ScrollBoxWidget) {
        ancestor.scrollIntoView(widget);
      }

      ancestor = ancestor.parent;
    }
  }

  #navigateFocus(direction: 1 | -1): void {
    const list = this.getFocusableWidgets();
    if (list.length === 0) {
      return;
    }

    let startIndex: number;
    if (this.#focusedWidget) {
      const currentIndex = list.indexOf(this.#focusedWidget);
      if (currentIndex === -1) {
        startIndex = direction === 1 ? 0 : list.length - 1;
      } else {
        startIndex = (currentIndex + direction + list.length) % list.length;
      }
    } else {
      startIndex = direction === 1 ? 0 : list.length - 1;
    }

    for (let i = 0; i < list.length; i++) {
      const index = (startIndex + (direction * i) + list.length) % list.length;
      if (list[index]!.acceptsFocus) {
        this.focusWidget(list[index]!);
        return;
      }
    }
  }
}
