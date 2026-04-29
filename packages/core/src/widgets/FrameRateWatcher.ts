import {TUI_CONTEXT_INSTANCE} from '../extern/app/TuiContext';
import TextWidget, {DEFAULT_TEXT_OPTIONS, type TextWidgetOptions} from './TextWidget';

export type FrameRateWatcherOptions = Omit<TextWidgetOptions, 'text'>;

export class FrameRateWatcher extends TextWidget {
  #latestTick = 0n;
  #timer: NodeJS.Timeout | null = null;
  constructor(options: Omit<TextWidgetOptions, 'text'>) {
    super({
      ...options,
      text: '0 fps',
    });
  }

  override mounted(): void {
    super.mounted();
    this.#timer = setInterval(() => {
      const currentTick = TUI_CONTEXT_INSTANCE.tick;
      this.updateText(`${currentTick - this.#latestTick} fps`);
      this.#latestTick = currentTick;
    }, 1 * 1000);
  }

  override unmounted(): void {
    super.unmounted();
    if (this.#timer) {
      clearInterval(this.#timer);
    }
  }
}

export function createFrameRateWatcher(options?: Partial<FrameRateWatcherOptions>) {
  return new FrameRateWatcher({
    ...DEFAULT_TEXT_OPTIONS,
    ...options,
  });
}

export default FrameRateWatcher;

