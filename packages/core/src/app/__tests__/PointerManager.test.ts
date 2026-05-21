import {it, expect, describe, beforeEach, afterEach} from 'bun:test';
import {PointerManager} from '../PointerManager';
import {FocusManager} from '../FocusManager';
import {EVENT_BUS} from '../../events';
import {TuiEventType, MouseEvent, type WheelEvent, type TuiEvent} from '../../events/types';
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
  readonly dispatched: Array<{event: string; data: unknown}> = [];

  override emitDrawCommands(_buf: DLB): void {}

  focus(): void {
    this.focused = true;
  }

  blur(): void {
    this.focused = false;
  }

  handleKey(): void {}

  override dispatch(event: string, data: unknown): void {
    this.dispatched.push({event, data});
    super.dispatch(event, data);
  }
}

class TrackableDraggableWidget extends TuiWidgetEntity {
  #rect = {x: 0, y: 0, width: 10, height: 5};
  readonly dispatched: Array<{event: string; data: unknown}> = [];

  override get rect() { return this.#rect; }
  override updateRect(r: Partial<{x: number; y: number; width: number; height: number}>): void {
    if (r.x !== undefined) this.#rect.x = r.x;
    if (r.y !== undefined) this.#rect.y = r.y;
    if (r.width !== undefined) this.#rect.width = r.width;
    if (r.height !== undefined) this.#rect.height = r.height;
  }

  override emitDrawCommands(_buf: DLB): void {}

  override dispatch(event: string, data: unknown): void {
    this.dispatched.push({event, data});
    super.dispatch(event, data);
  }
}

function mouseEvent(opts: Partial<{
  button: number;
  buttons: number;
  x: number;
  y: number;
  isRelease: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}>): MouseEvent {
  return {
    button: opts.button,
    buttons: opts.buttons,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    isRelease: opts.isRelease ?? false,
    shiftKey: opts.shiftKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    altKey: opts.altKey ?? false,
    metaKey: opts.metaKey ?? false,
  } as MouseEvent;
}

function wheelEvent(opts: {x: number; y: number; wheelDeltaY: number}): WheelEvent {
  return {
    ...mouseEvent({x: opts.x, y: opts.y}),
    wheelDeltaY: opts.wheelDeltaY,
  } as WheelEvent;
}

function createTestSetup() {
  let hitTestFn: (e: MouseEvent) => TuiWidgetEntity | undefined = () => undefined;

  const mockScene = {
    visible: true,
    hitTest(e: MouseEvent) {
      return hitTestFn(e);
    },
    setHitTest(fn: (e: MouseEvent) => TuiWidgetEntity | undefined) {
      hitTestFn = fn;
    },
  };

  const backend = new MockBackend();
  const focusManager = new FocusManager(() => mockScene as any);
  const pointerManager = new PointerManager(() => mockScene as any, focusManager);

  EVENT_BUS.attach(backend);
  EVENT_BUS.start();
  focusManager.start();
  pointerManager.start();

  function cleanup() {
    pointerManager.stop();
    focusManager.stop();
    EVENT_BUS.stop();
  }

  function emitMouse(opts: Parameters<typeof mouseEvent>[0]) {
    backend.emit(TuiEventType.MouseEvent, mouseEvent(opts));
  }

  function emitWheel(opts: {x: number; y: number; wheelDeltaY: number}) {
    backend.emit(TuiEventType.WheelEvent, wheelEvent(opts));
  }

  function mountWidget(widget: TuiWidgetEntity) {
    hitTestFn = () => widget;
  }

  return {mockScene, backend, focusManager, pointerManager, cleanup, emitMouse, emitWheel, mountWidget, setHitTest: mockScene.setHitTest};
}

describe('PointerManager', () => {
  let ctx: ReturnType<typeof createTestSetup>;

  afterEach(() => {
    ctx?.cleanup();
  });

  describe('start / stop lifecycle', () => {
    it('starts without error', () => {
      ctx = createTestSetup();
      expect(ctx.pointerManager).toBeDefined();
    });

    it('stop cleans up handlers', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      ctx.mountWidget(widget);
      ctx.pointerManager.stop();
      ctx.emitMouse({button: 0, x: 5, y: 5});
      expect(widget.dispatched).toHaveLength(0);
    });
  });

  describe('resetState', () => {
    it('can be called without error', () => {
      ctx = createTestSetup();
      expect(() => ctx.pointerManager.resetState()).not.toThrow();
    });
  });

  describe('left click', () => {
    it('dispatches mousedown + mouseup + click on same target', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      ctx.mountWidget(widget);

      ctx.emitMouse({button: 0, x: 5, y: 5});
      ctx.emitMouse({button: 0, x: 5, y: 5, isRelease: true});

      const events = widget.dispatched.map(d => d.event);
      expect(events).toContain('mousedown');
      expect(events).toContain('mouseup');
      expect(events).toContain('click');
    });

    it('does not dispatch click if release target differs from press target', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      let callCount = 0;
      ctx.setHitTest(() => {
        callCount++;
        if (callCount <= 1) return widget;
        return undefined;
      });

      ctx.emitMouse({button: 0, x: 5, y: 5});
      ctx.emitMouse({button: 0, x: 20, y: 20, isRelease: true});

      const events = widget.dispatched.map(d => d.event);
      expect(events).toContain('mousedown');
      expect(events).toContain('mouseup');
      expect(events).not.toContain('click');
    });

    it('focuses nearest focusable ancestor on press', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      ctx.mountWidget(widget);

      ctx.emitMouse({button: 0, x: 5, y: 5});
      expect(ctx.focusManager.focusedWidget).toBe(widget);
    });

    it('blurs when pressing empty area', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      ctx.mountWidget(widget);
      ctx.focusManager.focusWidget(widget);

      ctx.setHitTest(() => undefined);

      ctx.emitMouse({button: 0, x: 50, y: 50});
      expect(ctx.focusManager.focusedWidget).toBeUndefined();
    });
  });

  describe('right click', () => {
    it('dispatches contextmenu on press + release on same target', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      ctx.mountWidget(widget);

      ctx.emitMouse({button: MouseEvent.RIGHT_MOUSE_BUTTON, x: 5, y: 5});
      ctx.emitMouse({button: MouseEvent.RIGHT_MOUSE_BUTTON, x: 5, y: 5, isRelease: true});

      const events = widget.dispatched.map(d => d.event);
      expect(events).toContain('contextmenu');
    });

    it('does not dispatch contextmenu if release target differs', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      let callCount = 0;
      ctx.setHitTest(() => {
        callCount++;
        if (callCount <= 1) return widget;
        return undefined;
      });

      ctx.emitMouse({button: MouseEvent.RIGHT_MOUSE_BUTTON, x: 5, y: 5});
      ctx.emitMouse({button: MouseEvent.RIGHT_MOUSE_BUTTON, x: 20, y: 20, isRelease: true});

      const events = widget.dispatched.map(d => d.event);
      expect(events).not.toContain('contextmenu');
    });
  });

  describe('mouse move / hover', () => {
    it('dispatches mouseover on entering a widget', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      ctx.mountWidget(widget);

      ctx.emitMouse({x: 5, y: 5});
      const events = widget.dispatched.map(d => d.event);
      expect(events).toContain('mouseover');
    });

    it('dispatches mouseout on leaving a widget', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      ctx.mountWidget(widget);

      ctx.emitMouse({x: 5, y: 5});
      ctx.setHitTest(() => undefined);
      ctx.emitMouse({x: 50, y: 50});

      const events = widget.dispatched.map(d => d.event);
      expect(events).toContain('mouseover');
      expect(events).toContain('mouseout');
    });

    it('dispatches mousemove when moving within same widget', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      ctx.mountWidget(widget);

      ctx.emitMouse({x: 5, y: 5});
      ctx.emitMouse({x: 6, y: 6});

      const events = widget.dispatched.map(d => d.event);
      expect(events).toContain('mouseover');
      expect(events).toContain('mousemove');
    });
  });

  describe('wheel events', () => {
    it('dispatches wheel event to hit target', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      ctx.mountWidget(widget);

      ctx.emitWheel({x: 5, y: 5, wheelDeltaY: -3});
      const events = widget.dispatched.map(d => d.event);
      expect(events).toContain('wheel');
    });

    it('does not dispatch wheel when no hit target', () => {
      ctx = createTestSetup();
      const widget = new FocusableWidget();
      ctx.mountWidget(widget);
      ctx.setHitTest(() => undefined);

      ctx.emitWheel({x: 50, y: 50, wheelDeltaY: -3});
      expect(widget.dispatched).toHaveLength(0);
    });
  });

  describe('drag', () => {
    it('dispatches dragstart + drag + dragend for draggable widget', () => {
      ctx = createTestSetup();
      const widget = new TrackableDraggableWidget();
      widget.setDraggable(true);
      ctx.mountWidget(widget);

      ctx.emitMouse({button: 0, x: 5, y: 5});
      ctx.emitMouse({buttons: 1, x: 8, y: 8});
      ctx.emitMouse({button: 0, x: 8, y: 8, isRelease: true});

      const events = widget.dispatched.map(d => d.event);
      expect(events).toContain('dragstart');
      expect(events).toContain('drag');
      expect(events).toContain('dragend');
    });

    it('updates widget rect during drag', () => {
      ctx = createTestSetup();
      const widget = new TrackableDraggableWidget();
      widget.setDraggable(true);
      ctx.mountWidget(widget);

      ctx.emitMouse({button: 0, x: 5, y: 5});
      ctx.emitMouse({buttons: 1, x: 10, y: 10});

      expect(widget.rect.x).toBe(5);
      expect(widget.rect.y).toBe(5);
    });

    it('allows dragging to negative coordinates', () => {
      ctx = createTestSetup();
      const widget = new TrackableDraggableWidget();
      widget.updateRect({x: 3, y: 3});
      widget.setDraggable(true);
      ctx.mountWidget(widget);

      ctx.emitMouse({button: 0, x: 5, y: 5});
      ctx.emitMouse({buttons: 1, x: 1, y: 1});

      expect(widget.rect.x).toBe(-1);
      expect(widget.rect.y).toBe(-1);
    });

    it('dispatches update:x when x changes during drag', () => {
      ctx = createTestSetup();
      const widget = new TrackableDraggableWidget();
      widget.setDraggable(true);
      ctx.mountWidget(widget);

      ctx.emitMouse({button: 0, x: 5, y: 5});
      ctx.emitMouse({buttons: 1, x: 10, y: 5});

      const updateX = widget.dispatched.filter(d => d.event === 'update:x');
      expect(updateX.length).toBeGreaterThan(0);
      expect(updateX[0]!.data).toEqual({x: 5});
    });

    it('dispatches update:y when y changes during drag', () => {
      ctx = createTestSetup();
      const widget = new TrackableDraggableWidget();
      widget.setDraggable(true);
      ctx.mountWidget(widget);

      ctx.emitMouse({button: 0, x: 5, y: 5});
      ctx.emitMouse({buttons: 1, x: 5, y: 10});

      const updateY = widget.dispatched.filter(d => d.event === 'update:y');
      expect(updateY.length).toBeGreaterThan(0);
      expect(updateY[0]!.data).toEqual({y: 5});
    });

    it('does not dispatch update:x when x stays the same', () => {
      ctx = createTestSetup();
      const widget = new TrackableDraggableWidget();
      widget.setDraggable(true);
      ctx.mountWidget(widget);

      ctx.emitMouse({button: 0, x: 5, y: 5});
      ctx.emitMouse({buttons: 1, x: 5, y: 10});

      const updateX = widget.dispatched.filter(d => d.event === 'update:x');
      expect(updateX).toHaveLength(0);
    });
  });

  describe('no scene', () => {
    it('handles events gracefully when scene getter returns scene but hitTest returns undefined', () => {
      ctx = createTestSetup();
      ctx.setHitTest(() => undefined);
      expect(() => ctx.emitMouse({button: 0, x: 5, y: 5})).not.toThrow();
    });
  });
});
