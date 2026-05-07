import {DrawListBuffer} from '../draw_list/DrawListBuffer';
import {TUI_CONTEXT_INSTANCE} from '../extern/app/TuiContext';
import type {TuiScene} from '../extern/app/TuiScene';
import type {TuiBackend} from './TuiBackend';

export class RenderLoop {
  readonly #drawList = new DrawListBuffer();
  readonly #getScene: () => TuiScene | undefined;
  readonly #backend: TuiBackend;
  #running = false;

  constructor(getScene: () => TuiScene | undefined, backend: TuiBackend) {
    this.#getScene = getScene;
    this.#backend = backend;
  }

  start(): void {
    this.#running = true;
    const tick = () => {
      if (!this.#running) {
        return;
      }

      const scene = this.#getScene();
      if (scene) {
        this.#drawList.reset();
        scene.emitDrawCommands(this.#drawList);
        this.#drawList.finish();
        this.#backend.renderDrawList(TUI_CONTEXT_INSTANCE, this.#drawList);
      }

      setTimeout(tick, 5);
    };

    setTimeout(tick, 0);
  }

  stop(): void {
    this.#running = false;
  }
}
