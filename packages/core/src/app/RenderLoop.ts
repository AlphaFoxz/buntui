import {DrawListBuffer} from '../draw_list/DrawListBuffer';
import {TUI_CONTEXT_INSTANCE} from '../extern/app/TuiContext';
import type {TuiScene} from '../extern/app/TuiScene';
import {LOGGER} from '../common/logger';
import {nextTick, cancelTick} from '../platform/next-tick';
import type {TuiBackend} from './TuiBackend';

export type RenderLoopOptions = {
  tickRate?: number;
  renderRate?: number;
};

const DEFAULT_TICK_RATE = 60;
const DEFAULT_RENDER_RATE = 30;

export class RenderLoop {
  readonly #drawList = new DrawListBuffer();
  readonly #getScene: () => TuiScene | undefined;
  readonly #backend: TuiBackend;
  readonly #tickInterval: number;
  readonly #renderInterval: number;
  #running = false;
  #immediateId: ReturnType<typeof nextTick> | undefined;
  #lastTime = 0;
  #accumulator = 0;
  #lastRenderTime = 0;

  constructor(
    getScene: () => TuiScene | undefined,
    backend: TuiBackend,
    options?: RenderLoopOptions,
  ) {
    this.#getScene = getScene;
    this.#backend = backend;
    this.#tickInterval = 1000 / (options?.tickRate ?? DEFAULT_TICK_RATE);
    this.#renderInterval = 1000 / (options?.renderRate ?? DEFAULT_RENDER_RATE);
  }

  start(): void {
    this.#running = true;
    this.#lastTime = performance.now();
    this.#lastRenderTime = this.#lastTime;
    this.#accumulator = 0;

    const loop = () => {
      if (!this.#running) {
        return;
      }

      try {
        const scene = this.#getScene();
        if (scene?.visible) {
          const now = performance.now();
          const dt = now - this.#lastTime;
          this.#lastTime = now;

          this.#accumulator += dt;
          while (this.#accumulator >= this.#tickInterval) {
            scene.update(this.#tickInterval);
            this.#accumulator -= this.#tickInterval;
          }

          if (now - this.#lastRenderTime >= this.#renderInterval) {
            this.#drawList.reset();
            scene.emitDrawCommands(this.#drawList);
            this.#drawList.finish();
            this.#backend.renderDrawList(TUI_CONTEXT_INSTANCE, this.#drawList);
            this.#lastRenderTime = now;
          }
        }
      } catch (error) {
        LOGGER.logError(`Render loop error: ${formatError(error)}`);
      }

      this.#immediateId = nextTick(loop);
    };

    this.#immediateId = nextTick(loop);
  }

  stop(): void {
    this.#running = false;
    if (this.#immediateId !== undefined) {
      cancelTick(this.#immediateId);
      this.#immediateId = undefined;
    }
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}
