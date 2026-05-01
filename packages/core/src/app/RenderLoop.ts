import {DrawListBuffer} from '../draw_list/DrawListBuffer';
import app, {TUI_CONTEXT_INSTANCE} from '../extern/app';
import type {TuiScene} from '../extern/app/TuiScene';

export class RenderLoop {
  readonly #drawList = new DrawListBuffer();
  readonly #getScene: () => TuiScene | undefined;
  #running = false;

  constructor(getScene: () => TuiScene | undefined) {
    this.#getScene = getScene;
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
        app.renderDrawList(TUI_CONTEXT_INSTANCE, this.#drawList);
      }

      setTimeout(tick, 5);
    };

    setTimeout(tick, 0);
  }

  stop(): void {
    this.#running = false;
  }
}
