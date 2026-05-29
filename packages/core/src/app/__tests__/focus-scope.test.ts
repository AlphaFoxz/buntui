import {it, expect, describe, beforeEach, afterEach} from 'bun:test';
import {FocusManager} from '../FocusManager';
import {EVENT_BUS} from '../../events';
import {TuiEventType, type KeyboardEvent} from '../../events/types';
import type {TuiBackend, TuiBackendEventHandler} from '../TuiBackend';
import type {Focusable} from '../../widgets/Focusable';
import {TuiWidgetEntity} from '../../widgets/TuiWidgetEntity';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {TuiEvent} from '../../events/types';

class MockBackend implements TuiBackend {
  #handler: TuiBackendEventHandler | undefined;
  setupLogger() {}
  startApp() {}
  stopApp() {}
  detectTermSize() {}
  renderDrawList() {}
  startEvents(handler: TuiBackendEventHandler): void { this.#handler = handler; }
  stopEvents(): void { this.#handler = undefined; }
  emit(eventType: number, event: TuiEvent): void { this.#handler?.(eventType, event); }
}

class FocusableWidget extends TuiWidgetEntity implements Focusable {
  focused = false;
  acceptsFocus = true;
  override emitDrawCommands(_buf: DrawListBuffer): void {}
  focus(): void { this.focused = true; }
  blur(): void { this.focused = false; }
  handleKey(_event: KeyboardEvent): void {}
}

class ScopeWidget extends TuiWidgetEntity {
  override emitDrawCommands(_buf: DrawListBuffer): void {}
}

function keyEvent(key: string, shiftKey = false): KeyboardEvent {
  return {key, shiftKey, ctrlKey: false, altKey: false, metaKey: false, repeat: false, charCode: 0};
}

describe('FocusManager focus scope', () => {
  let manager: FocusManager;
  const backend = new MockBackend();

  beforeEach(() => {
    manager = new FocusManager(() => undefined);
    EVENT_BUS.attach(backend);
    EVENT_BUS.start();
  });

  afterEach(() => {
    manager.stop();
    EVENT_BUS.stop();
  });

  it('pushFocusScope / popFocusScope filter getFocusableWidgets', () => {
    const scopeRoot = new ScopeWidget();
    const inside = new FocusableWidget();
    const outside = new FocusableWidget();
    scopeRoot.addChild(inside);

    const list = [inside, outside] as Array<TuiWidgetEntity & Focusable>;
    const scopedManager = new FocusManager(() => ({getFocusableWidgets: () => list} as any));
    scopedManager.start();

    expect(scopedManager.getFocusableWidgets()).toHaveLength(2);

    scopedManager.pushFocusScope(scopeRoot);
    expect(scopedManager.getFocusableWidgets()).toHaveLength(1);
    expect(scopedManager.getFocusableWidgets()[0]).toBe(inside);

    scopedManager.popFocusScope();
    expect(scopedManager.getFocusableWidgets()).toHaveLength(2);

    scopedManager.stop();
  });

  it('Tab navigation stays within focus scope', () => {
    const scopeRoot = new ScopeWidget();
    const inside1 = new FocusableWidget();
    const inside2 = new FocusableWidget();
    const outside = new FocusableWidget();
    scopeRoot.addChild(inside1);
    scopeRoot.addChild(inside2);

    const list = [inside1, inside2, outside] as Array<TuiWidgetEntity & Focusable>;
    const scopedManager = new FocusManager(() => ({getFocusableWidgets: () => list} as any));
    scopedManager.start();

    scopedManager.pushFocusScope(scopeRoot);
    scopedManager.focusWidget(inside1);
    backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab'));
    expect(scopedManager.focusedWidget).toBe(inside2);

    backend.emit(TuiEventType.KeyboardEvent, keyEvent('Tab'));
    expect(scopedManager.focusedWidget).toBe(inside1);

    scopedManager.stop();
  });

  it('nested focus scopes', () => {
    const outer = new ScopeWidget();
    const inner = new ScopeWidget();
    const outerWidget = new FocusableWidget();
    const innerWidget = new FocusableWidget();
    outer.addChild(outerWidget);
    outer.addChild(inner);
    inner.addChild(innerWidget);

    const list = [outerWidget, innerWidget] as Array<TuiWidgetEntity & Focusable>;
    const scopedManager = new FocusManager(() => ({getFocusableWidgets: () => list} as any));
    scopedManager.start();

    scopedManager.pushFocusScope(outer);
    expect(scopedManager.getFocusableWidgets()).toHaveLength(2);

    scopedManager.pushFocusScope(inner);
    expect(scopedManager.getFocusableWidgets()).toHaveLength(1);
    expect(scopedManager.getFocusableWidgets()[0]).toBe(innerWidget);

    scopedManager.popFocusScope();
    expect(scopedManager.getFocusableWidgets()).toHaveLength(2);

    scopedManager.stop();
  });
});
