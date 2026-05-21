import {it, expect, describe, beforeEach, afterEach} from 'bun:test';
import {FocusManager} from '../FocusManager';
import {EVENT_BUS} from '../../events';
import {TuiEventType, type KeyboardEvent, type TuiEvent} from '../../events/types';
import type {TuiBackend, TuiBackendEventHandler} from '../TuiBackend';
import type {Focusable} from '../../widgets/Focusable';
import {TuiWidgetEntity} from '../../widgets/TuiWidgetEntity';
import type {DrawListBuffer as DLB} from '../../draw_list/DrawListBuffer';

class MockBackend implements TuiBackend {
  #handler: TuiBackendEventHandler | undefined;

  setupLogger() {}
  startApp() {}
  stopApp() {}
  detectTermSize() {}
  renderDrawList() {}

  startEvents(handler: TuiBackendEventHandler): void {
    this.#handler = handler;
  }

  stopEvents(): void {
    this.#handler = undefined;
  }

  emit(eventType: number, event: TuiEvent): void {
    this.#handler?.(eventType, event);
  }
}

class FocusableWidget extends TuiWidgetEntity implements Focusable {
  focused = false;
  acceptsFocus = true;
  readonly keyEvents: KeyboardEvent[] = [];

  override emitDrawCommands(_buf: DLB): void {}

  focus(): void {
    this.focused = true;
  }

  blur(): void {
    this.focused = false;
  }

  handleKey(event: KeyboardEvent): void {
    this.keyEvents.push(event);
  }
}

function keyEvent(key: string, shiftKey = false): KeyboardEvent {
  return {
    key,
    shiftKey,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    charCode: 0,
  };
}

describe('FocusManager', () => {
  let manager: FocusManager;
  const backend = new MockBackend();
  const registeredHandlers: Array<{type: number; fn: (data: unknown) => void}> = [];

  beforeEach(() => {
    manager = new FocusManager(() => undefined);
    EVENT_BUS.attach(backend);
    EVENT_BUS.start();
  });

  afterEach(() => {
    manager.stop();
    EVENT_BUS.stop();
    for (const {type, fn} of registeredHandlers) {
      EVENT_BUS.off(type as TuiEventType, fn as any);
    }

    registeredHandlers.length = 0;
  });

  describe('start / stop lifecycle', () => {
    it('starts without error', () => {
      expect(() => manager.start()).not.toThrow();
    });

    it('stop clears focused widget', () => {
      const widget = new FocusableWidget();
      manager.start();
      manager.focusWidget(widget);
      expect(manager.focusedWidget).toBe(widget);
      manager.stop();
      expect(manager.focusedWidget).toBeUndefined();
    });

    it('stop with no focused widget does not throw', () => {
      manager.start();
      expect(() => manager.stop()).not.toThrow();
    });
  });

  describe('focusWidget', () => {
    it('focuses a widget', () => {
      manager.start();
      const widget = new FocusableWidget();
      manager.focusWidget(widget);
      expect(manager.focusedWidget).toBe(widget);
      expect(widget.focused).toBe(true);
    });

    it('skips widget that does not accept focus', () => {
      manager.start();
      const widget = new FocusableWidget();
      widget.acceptsFocus = false;
      manager.focusWidget(widget);
      expect(manager.focusedWidget).toBeUndefined();
    });

    it('blurs previous widget when focusing new one', () => {
      manager.start();
      const widget1 = new FocusableWidget();
      const widget2 = new FocusableWidget();
      manager.focusWidget(widget1);
      manager.focusWidget(widget2);
      expect(widget1.focused).toBe(false);
      expect(widget2.focused).toBe(true);
      expect(manager.focusedWidget).toBe(widget2);
    });

    it('does nothing if same widget is focused again', () => {
      manager.start();
      const widget = new FocusableWidget();
      manager.focusWidget(widget);
      const beforeFocused = widget.focused;
      manager.focusWidget(widget);
      expect(widget.focused).toBe(beforeFocused);
    });
  });

  describe('blurWidget', () => {
    it('blurs the current widget', () => {
      manager.start();
      const widget = new FocusableWidget();
      manager.focusWidget(widget);
      manager.blurWidget();
      expect(widget.focused).toBe(false);
      expect(manager.focusedWidget).toBeUndefined();
    });

    it('does nothing when no widget is focused', () => {
      manager.start();
      expect(() => manager.blurWidget()).not.toThrow();
    });
  });

  describe('keyboard event routing', () => {
    it('routes keyboard events to focused widget', () => {
      manager.start();
      const widget = new FocusableWidget();
      manager.focusWidget(widget);

      const event = keyEvent('a');
      backend.emit(TuiEventType.KeyboardEvent, event);
      expect(widget.keyEvents).toHaveLength(1);
      expect(widget.keyEvents[0]).toBe(event);
    });

    it('calls onUnfocusedKey when no widget is focused', () => {
      const unfocusedKeys: KeyboardEvent[] = [];
      manager.start(data => unfocusedKeys.push(data));

      const event = keyEvent('b');
      backend.emit(TuiEventType.KeyboardEvent, event);
      expect(unfocusedKeys).toHaveLength(1);
      expect(unfocusedKeys[0]).toBe(event);
    });

    it('does not call onUnfocusedKey when a widget is focused', () => {
      const unfocusedKeys: KeyboardEvent[] = [];
      manager.start(data => unfocusedKeys.push(data));

      const widget = new FocusableWidget();
      manager.focusWidget(widget);

      backend.emit(TuiEventType.KeyboardEvent, keyEvent('c'));
      expect(unfocusedKeys).toHaveLength(0);
    });

    it('stops routing keyboard events after stop', () => {
      manager.start();
      const widget = new FocusableWidget();
      manager.focusWidget(widget);
      manager.stop();

      backend.emit(TuiEventType.KeyboardEvent, keyEvent('d'));
      expect(widget.keyEvents).toHaveLength(0);
    });
  });

  describe('focusedWidget getter', () => {
    it('returns undefined initially', () => {
      manager.start();
      expect(manager.focusedWidget).toBeUndefined();
    });

    it('returns the focused widget', () => {
      manager.start();
      const widget = new FocusableWidget();
      manager.focusWidget(widget);
      expect(manager.focusedWidget).toBe(widget);
    });
  });

  describe('Tab / Shift+Tab focus navigation', () => {
    let widgets: FocusableWidget[];
    let tabManager: FocusManager;

    beforeEach(() => {
      widgets = [new FocusableWidget(), new FocusableWidget(), new FocusableWidget()];
      const list = widgets as Array<TuiWidgetEntity & Focusable>;
      tabManager = new FocusManager(() => ({
        getFocusableWidgets: () => list,
      } as any));
      tabManager.start();
    });

    afterEach(() => {
      tabManager.stop();
    });

    it('Tab with no focus focuses first widget', () => {
      backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab'));
      expect(tabManager.focusedWidget).toBe(widgets[0]);
    });

    it('Shift+Tab with no focus focuses last widget', () => {
      backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab', true));
      expect(tabManager.focusedWidget).toBe(widgets[2]);
    });

    it('Tab moves to next widget', () => {
      tabManager.focusWidget(widgets[0]!);
      backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab'));
      expect(tabManager.focusedWidget).toBe(widgets[1]);
    });

    it('Tab wraps from last to first', () => {
      tabManager.focusWidget(widgets[2]!);
      backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab'));
      expect(tabManager.focusedWidget).toBe(widgets[0]);
    });

    it('Shift+Tab moves to previous widget', () => {
      tabManager.focusWidget(widgets[2]!);
      backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab', true));
      expect(tabManager.focusedWidget).toBe(widgets[1]);
    });

    it('Shift+Tab wraps from first to last', () => {
      tabManager.focusWidget(widgets[0]!);
      backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab', true));
      expect(tabManager.focusedWidget).toBe(widgets[2]);
    });

    it('Tab with single widget wraps to itself', () => {
      const single = [new FocusableWidget()] as Array<TuiWidgetEntity & Focusable>;
      const singleManager = new FocusManager(() => ({
        getFocusableWidgets: () => single,
      } as any));
      singleManager.start();

      singleManager.focusWidget(single[0]!);
      backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab'));
      expect(singleManager.focusedWidget).toBe(single[0]);

      singleManager.stop();
    });

    it('Tab with no focusable widgets does nothing', () => {
      const emptyManager = new FocusManager(() => ({
        getFocusableWidgets: () => [],
      } as any));
      emptyManager.start();

      backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab'));
      expect(emptyManager.focusedWidget).toBeUndefined();

      emptyManager.stop();
    });

    it('Tab does not reach focused widget handleKey', () => {
      tabManager.focusWidget(widgets[0]!);
      backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab'));
      expect(widgets[0]!.keyEvents).toHaveLength(0);
      expect(widgets[1]!.keyEvents).toHaveLength(0);
    });

    it('Tab when focused widget not in list focuses first', () => {
      const orphan = new FocusableWidget();
      tabManager.focusWidget(orphan);
      backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab'));
      expect(tabManager.focusedWidget).toBe(widgets[0]);
    });
  });
});
