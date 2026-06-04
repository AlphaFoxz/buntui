import {it, expect, describe, afterEach} from 'bun:test';
import {RenderLoop} from '../RenderLoop';
import type {TuiBackend} from '../TuiBackend';
import type {TuiScene} from '../../extern/app/TuiScene';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import type {TuiContextLike} from '../../extern/app/TuiContext';
import TUI_CONTEXT_INSTANCE from '../../extern/app/TuiContext';

class MockBackend implements TuiBackend {
  readonly renderCalls: DrawListBuffer[] = [];

  setupLogger() {}
  startApp() {}
  stopApp() {}
  detectTermSize() {}
  startEvents() {}
  stopEvents() {}

  renderDrawList(_context: TuiContextLike, buffer: DrawListBuffer): void {
    this.renderCalls.push(buffer);
  }
}

function createMockScene(visible: boolean, emitDrawCommands?: (buf: DrawListBuffer) => void): TuiScene {
  return {visible, update: () => {}, emitDrawCommands: emitDrawCommands ?? (() => {})} as unknown as TuiScene;
}

describe('RenderLoop', () => {
  let renderLoop: RenderLoop;

  afterEach(() => {
    renderLoop?.stop();
  });

  describe('start / stop lifecycle', () => {
    it('start does not throw', () => {
      const backend = new MockBackend();
      renderLoop = new RenderLoop(() => createMockScene(false), backend, TUI_CONTEXT_INSTANCE);
      expect(() => renderLoop.start()).not.toThrow();
    });

    it('stop does not throw after start', () => {
      const backend = new MockBackend();
      renderLoop = new RenderLoop(() => createMockScene(false), backend, TUI_CONTEXT_INSTANCE);
      renderLoop.start();
      expect(() => renderLoop.stop()).not.toThrow();
    });

    it('stop without start does not throw', () => {
      const backend = new MockBackend();
      renderLoop = new RenderLoop(() => createMockScene(false), backend, TUI_CONTEXT_INSTANCE);
      expect(() => renderLoop.stop()).not.toThrow();
    });
  });

  describe('rendering', () => {
    it('renders visible scene after start', async () => {
      const backend = new MockBackend();
      renderLoop = new RenderLoop(() => createMockScene(true), backend, TUI_CONTEXT_INSTANCE);
      renderLoop.start();

      // Wait for at least one tick
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(backend.renderCalls.length).toBeGreaterThan(0);
    });

    it('does not render invisible scene', async () => {
      const backend = new MockBackend();
      renderLoop = new RenderLoop(() => createMockScene(false), backend, TUI_CONTEXT_INSTANCE);
      renderLoop.start();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(backend.renderCalls).toHaveLength(0);
    });

    it('stops rendering after stop', async () => {
      const backend = new MockBackend();
      renderLoop = new RenderLoop(() => createMockScene(true), backend, TUI_CONTEXT_INSTANCE);
      renderLoop.start();

      await new Promise(resolve => setTimeout(resolve, 50));
      renderLoop.stop();

      const countAfterStop = backend.renderCalls.length;

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(backend.renderCalls.length).toBe(countAfterStop);
    });

    it('does not render when scene is undefined', async () => {
      const backend = new MockBackend();
      renderLoop = new RenderLoop(() => undefined, backend, TUI_CONTEXT_INSTANCE);
      renderLoop.start();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(backend.renderCalls).toHaveLength(0);
    });
  });

  describe('tick rate', () => {
    it('calls scene.update with fixed timestep', async () => {
      const backend = new MockBackend();
      const updateDts: number[] = [];
      const scene = createMockScene(true);
      scene.update = (dt: number) => { updateDts.push(dt); };
      renderLoop = new RenderLoop(() => scene, backend, TUI_CONTEXT_INSTANCE, {tickRate: 60, renderRate: 1000});
      renderLoop.start();

      await new Promise(resolve => setTimeout(resolve, 100));
      renderLoop.stop();

      expect(updateDts.length).toBeGreaterThan(0);
      for (const dt of updateDts) {
        expect(dt).toBeCloseTo(1000 / 60, 0);
      }
    });

    it('respects custom tickRate', async () => {
      const backend = new MockBackend();
      const updateDts: number[] = [];
      const scene = createMockScene(true);
      scene.update = (dt: number) => { updateDts.push(dt); };
      renderLoop = new RenderLoop(() => scene, backend, TUI_CONTEXT_INSTANCE, {tickRate: 10, renderRate: 1000});
      renderLoop.start();

      await new Promise(resolve => setTimeout(resolve, 100));
      renderLoop.stop();

      for (const dt of updateDts) {
        expect(dt).toBeCloseTo(100, 0);
      }
    });
  });

  describe('render rate', () => {
    it('renders fewer frames with low renderRate', async () => {
      const backendHigh = new MockBackend();
      const loopHigh = new RenderLoop(() => createMockScene(true), backendHigh, TUI_CONTEXT_INSTANCE, {renderRate: 60, tickRate: 10});
      loopHigh.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      loopHigh.stop();

      const backendLow = new MockBackend();
      const loopLow = new RenderLoop(() => createMockScene(true), backendLow, TUI_CONTEXT_INSTANCE, {renderRate: 5, tickRate: 10});
      loopLow.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      loopLow.stop();

      expect(backendLow.renderCalls.length).toBeLessThan(backendHigh.renderCalls.length);
    });
  });
});
