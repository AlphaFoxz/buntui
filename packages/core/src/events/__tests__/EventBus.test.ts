import {it, expect, describe, afterEach} from 'bun:test';
import {EVENT_BUS} from '../index';
import {type TuiBackend, type TuiBackendEventHandler} from '../../app/TuiBackend';
import {TuiEventType} from '../types';
import type {LogLevel} from '../../extern/app/types';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {CStruct} from '../../extern/types';

class MockBackend implements TuiBackend {
  #handler: TuiBackendEventHandler | undefined;
  started = false;
  stopped = false;

  setupLogger(_logFileDir: string, _logName: string, _logLevel: LogLevel, _clearLog: boolean): void {}
  startApp(): void {}
  stopApp(): void {}
  detectTermSize(_context: CStruct): void {}
  renderDrawList(_context: CStruct, _buffer: DrawListBuffer): void {}

  startEvents(handler: TuiBackendEventHandler): void {
    this.#handler = handler;
    this.started = true;
  }

  stopEvents(): void {
    this.#handler = undefined;
    this.stopped = true;
  }

  emit(eventType: number, event: any): void {
    this.#handler?.(eventType, event);
  }
}

describe('EventBus', () => {
  const mockBackend = new MockBackend();
  const handlers: Array<{type: number; fn: (data: any) => void}> = [];

  function registerHandler(type: number, fn: (data: any) => void) {
    handlers.push({type, fn});
    EVENT_BUS.on(type, fn);
  }

  afterEach(() => {
    EVENT_BUS.stop();
    for (const {type, fn} of handlers) {
      EVENT_BUS.off(type as any, fn);
    }

    handlers.length = 0;
  });

  it('start without attach throws', () => {
    expect(() => EVENT_BUS.start()).toThrow('no backend attached');
  });

  it('attach + start wires backend', () => {
    EVENT_BUS.attach(mockBackend);
    EVENT_BUS.start();
    expect(mockBackend.started).toBe(true);
  });

  it('stop calls backend.stopEvents', () => {
    EVENT_BUS.attach(mockBackend);
    EVENT_BUS.start();
    EVENT_BUS.stop();
    expect(mockBackend.stopped).toBe(true);
  });

  it('delivers event to registered handler', () => {
    const received: unknown[] = [];
    registerHandler(TuiEventType.KeyboardEvent, data => received.push(data));

    EVENT_BUS.attach(mockBackend);
    EVENT_BUS.start();

    mockBackend.emit(TuiEventType.KeyboardEvent, {key: 'a'});
    expect(received).toHaveLength(1);
    expect((received[0] as any).key).toBe('a');
  });

  it('delivers events to multiple handlers for same type', () => {
    const received1: unknown[] = [];
    const received2: unknown[] = [];
    registerHandler(TuiEventType.MouseEvent, data => received1.push(data));
    registerHandler(TuiEventType.MouseEvent, data => received2.push(data));

    EVENT_BUS.attach(mockBackend);
    EVENT_BUS.start();

    mockBackend.emit(TuiEventType.MouseEvent, {x: 5, y: 10});
    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
  });

  it('only delivers to handlers of the correct type', () => {
    const keyReceived: unknown[] = [];
    const mouseReceived: unknown[] = [];
    registerHandler(TuiEventType.KeyboardEvent, data => keyReceived.push(data));
    registerHandler(TuiEventType.MouseEvent, data => mouseReceived.push(data));

    EVENT_BUS.attach(mockBackend);
    EVENT_BUS.start();

    mockBackend.emit(TuiEventType.KeyboardEvent, {key: 'q'});
    expect(keyReceived).toHaveLength(1);
    expect(mouseReceived).toHaveLength(0);
  });

  it('off removes specific handler', () => {
    let count = 0;
    const handler = () => { count++; };
    registerHandler(TuiEventType.WheelEvent, handler);

    EVENT_BUS.attach(mockBackend);
    EVENT_BUS.start();

    EVENT_BUS.off(TuiEventType.WheelEvent, handler);
    mockBackend.emit(TuiEventType.WheelEvent, {wheelDeltaY: -3});
    expect(count).toBe(0);
  });

  it('off with unregistered handler does nothing', () => {
    EVENT_BUS.off(TuiEventType.KeyboardEvent, () => {});
  });

  it('no handlers for event type does nothing', () => {
    EVENT_BUS.attach(mockBackend);
    EVENT_BUS.start();

    // No handler registered for TermResizeEvent
    mockBackend.emit(TuiEventType.TermResizeEvent, {rows: 24, cols: 80});
  });

  it('delivers different event types to correct handlers', () => {
    const keyEvents: unknown[] = [];
    const resizeEvents: unknown[] = [];
    registerHandler(TuiEventType.KeyboardEvent, data => keyEvents.push(data));
    registerHandler(TuiEventType.TermResizeEvent, data => resizeEvents.push(data));

    EVENT_BUS.attach(mockBackend);
    EVENT_BUS.start();

    mockBackend.emit(TuiEventType.KeyboardEvent, {key: 'x'});
    mockBackend.emit(TuiEventType.TermResizeEvent, {rows: 30, cols: 100});
    mockBackend.emit(TuiEventType.KeyboardEvent, {key: 'y'});

    expect(keyEvents).toHaveLength(2);
    expect(resizeEvents).toHaveLength(1);
  });
});
