import {TUI_CONTEXT_INSTANCE} from '../extern/app/TuiContext';
import TextWidget, {DEFAULT_TEXT_OPTIONS, type TextWidgetOptions} from './TextWidget';

export type FrameRateWatcherOptions = Omit<TextWidgetOptions, 'text'>;

export class FrameRateWatcher extends TextWidget {
  readonly #latestTick = 0n;
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
      this.updateText(`${TUI_CONTEXT_INSTANCE.tick - this.#latestTick} fps`);
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

