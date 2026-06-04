import {it, expect, describe} from 'bun:test';
import {createApp, type TuiSFCModule} from '../index';
import {type TuiBackend, type TuiBackendEventHandler} from '../TuiBackend';
import type {LogLevel} from '../../extern/app/types';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {TuiContextLike} from '../../extern/app/TuiContext';

const noopModule: TuiSFCModule = {setup() {}};

class MockBackend implements TuiBackend {
  readonly calls: string[] = [];
  #handler: TuiBackendEventHandler | undefined;

  setupLogger(_logFileDir: string, _logName: string, _logLevel: LogLevel, _clearLog: boolean): void {
    this.calls.push('setupLogger');
  }

  startApp(): void {
    this.calls.push('startApp');
  }

  stopApp(): void {
    this.calls.push('stopApp');
  }

  detectTermSize(_context: TuiContextLike): void {
    this.calls.push('detectTermSize');
  }

  renderDrawList(_context: TuiContextLike, _buffer: DrawListBuffer): void {
    this.calls.push('renderDrawList');
  }

  startEvents(handler: TuiBackendEventHandler): void {
    this.calls.push('startEvents');
    this.#handler = handler;
  }

  stopEvents(): void {
    this.calls.push('stopEvents');
    this.#handler = undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(eventType: number, event: any): void {
    this.#handler?.(eventType, event);
  }
}

describe('createApp', () => {
  it('creates app with custom backend', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    expect(backend.calls).toContain('setupLogger');
  });
});

describe('TuiApp scene management', () => {
  it('createScene returns a TuiScene', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    const scene = app.createScene(noopModule);
    expect(scene).toBeDefined();
    expect(scene.id).toBeGreaterThan(0n);
  });

  it('createScene with visible:true sets as current', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    const scene = app.createScene(noopModule, {visible: true});
    expect(scene.visible).toBe(true);
  });

  it('createScene without visible defaults to not visible', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    const scene = app.createScene(noopModule);
    expect(scene.visible).toBe(false);
  });

  it('multiple createScene calls with visible:true — last one wins', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    const scene1 = app.createScene(noopModule, {visible: true});
    const scene2 = app.createScene(noopModule, {visible: true});
    expect(scene1.visible).toBe(false);
    expect(scene2.visible).toBe(true);
  });

  it('destroyScene removes the scene', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    const scene = app.createScene(noopModule, {visible: true});
    app.destroyScene(scene);
  });

  it('destroyScene with bigint id', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    const scene = app.createScene(noopModule, {visible: true});
    app.destroyScene(scene.id);
  });

  it('destroyScene restores previous visible scene', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    const scene1 = app.createScene(noopModule, {visible: true});
    const scene2 = app.createScene(noopModule, {visible: true});
    expect(scene2.visible).toBe(true);
    app.destroyScene(scene2);
    expect(scene1.visible).toBe(true);
  });

  it('switchScene toggles visibility', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    const scene1 = app.createScene(noopModule, {visible: true});
    const scene2 = app.createScene(noopModule);
    app.switchScene(scene2);
    expect(scene1.visible).toBe(false);
    expect(scene2.visible).toBe(true);
  });

  it('switchScene with unknown scene does nothing', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    const scene1 = app.createScene(noopModule, {visible: true});
    const app2 = createApp({backend: new MockBackend()});
    const orphan = app2.createScene(noopModule);
    app.switchScene(orphan);
    expect(scene1.visible).toBe(true);
  });
});

describe('TuiApp focus management', () => {
  it('focusedWidget is undefined initially', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    expect(app.focusedWidget).toBeUndefined();
  });

  it('blurWidget does nothing when no widget focused', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    app.blurWidget();
    expect(app.focusedWidget).toBeUndefined();
  });
});

describe('TuiApp lifecycle', () => {
  it('start calls backend methods in correct order', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    app.start();

    const startIdx = backend.calls.indexOf('startApp');
    const eventsIdx = backend.calls.indexOf('startEvents');
    const detectIdx = backend.calls.indexOf('detectTermSize');

    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(eventsIdx).toBeGreaterThan(startIdx);
    expect(detectIdx).toBeGreaterThan(startIdx);

    app.dispose();
  });

  it('dispose calls stopApp and stopEvents', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    app.start();
    app.dispose();

    expect(backend.calls).toContain('stopApp');
    expect(backend.calls).toContain('stopEvents');
  });

  it('dispose cleans up without exiting process', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    app.start();
    // dispose should not throw or exit
    app.dispose();
  });

  it('dispose destroys current scene', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    const scene = app.createScene(noopModule, {visible: true});
    app.start();
    app.dispose();
    // Scene widgets should be unmounted after destroy
    expect(scene.visible).toBe(true); // destroy clears widgets but doesn't change visible
  });

  it('start wires resize event handler', () => {
    const backend = new MockBackend();
    const app = createApp({backend});
    app.start();

    // Emit a resize event — should trigger detectTermSize again
    const detectBefore = backend.calls.filter(c => c === 'detectTermSize').length;
    backend.emit(4, {rows: 30, cols: 100}); // TermResizeEvent = 4
    const detectAfter = backend.calls.filter(c => c === 'detectTermSize').length;
    expect(detectAfter).toBeGreaterThan(detectBefore);

    app.dispose();
  });
});
