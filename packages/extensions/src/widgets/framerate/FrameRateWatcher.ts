import {
  BoxWidget,
  DEFAULT_BOX_OPTIONS,
  TextWidget,
  TUI_CONTEXT_INSTANCE,
  type BoxWidgetOptions,
} from '@buntui/core';

export type FrameRateWatcherOptions = BoxWidgetOptions;

export class FrameRateWatcher extends BoxWidget {
  #latestTick = 0n;
  #timer: NodeJS.Timeout | null = null;
  readonly #label: TextWidget;

  constructor(options: Partial<BoxWidgetOptions> = {}) {
    super({
      ...DEFAULT_BOX_OPTIONS,
      ...options,
    });
    this.#label = new TextWidget({
      x: (options.x ?? 0) as U16,
      y: (options.y ?? 0) as U16,
      width: (options.width ?? 0) as U16,
      height: (options.height ?? 0) as U16,
      colorFg: (options.colorFg ?? 0xFF_FF_FF_FF) as U32,
      colorBg: 0x00_00_00_00 as U32,
      value: '0 fps',
    });
    this.addChild(this.#label);
  }

  override mounted(): void {
    super.mounted();
    this.#timer = setInterval(() => {
      const currentTick = TUI_CONTEXT_INSTANCE.tick;
      this.#label.updateValue(`${currentTick - this.#latestTick} fps`);
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
  return new FrameRateWatcher(options);
}

export default FrameRateWatcher;
