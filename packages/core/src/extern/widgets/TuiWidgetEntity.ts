import type {Mountable} from '../types';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';

export abstract class TuiWidgetEntity implements Mountable {
  #refrenceCount = 0;

  get refrenceCount() {
    return this.#refrenceCount;
  }

  mounted() {
    this.#refrenceCount++;
  }

  unmounted(): void {
    this.#refrenceCount--;
  }

  abstract emitDrawCommands(buf: DrawListBuffer): void;

  get zIndex(): number {
    return 0;
  }
}
