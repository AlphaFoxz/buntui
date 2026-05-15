import {
  BoxWidget,
  TextWidget,
  TUI_CONTEXT_INSTANCE,
  getTheme,
  isPercent,
  type BoxWidgetOptions,
} from '@buntui/core';

export type FrameRateWatcherOptions = BoxWidgetOptions;

export class FrameRateWatcher extends BoxWidget {
  #latestTick = 0n;
  #timer: NodeJS.Timeout | null = null;
  readonly #label: TextWidget;

  constructor(options: Partial<BoxWidgetOptions> = {}) {
    super({
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: options.width ?? 32,
      height: options.height ?? 3,
      borderStyle: options.borderStyle ?? 'solid',
      borderTop: options.borderTop ?? true,
      borderRight: options.borderRight ?? true,
      borderBottom: options.borderBottom ?? true,
      borderLeft: options.borderLeft ?? true,
      colorFg: options.colorFg,
      colorBg: options.colorBg,
      borderColor: options.borderColor,
      shadowColor: options.shadowColor,
    });
    this.#label = new TextWidget({
      x: isPercent(options.x) ? 0 : (options.x ?? 0),
      y: isPercent(options.y) ? 0 : (options.y ?? 0),
      width: isPercent(options.width) ? 0 : (options.width ?? 0),
      height: isPercent(options.height) ? 0 : (options.height ?? 0),
      colorFg: options.colorFg ?? getTheme().colors.text,
      colorBg: 0x00_00_00_00,
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
