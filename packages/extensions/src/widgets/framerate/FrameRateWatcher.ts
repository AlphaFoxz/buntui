import {
  type DrawListBuffer,
  type TuiWidgetRect,
  type TuiSizeValue,
  TUI_CONTEXT_INSTANCE,
  TuiWidgetEntity,
  getTheme,
  onThemeChange,
  parseColor,
  type TuiColor,
} from '@buntui/core';

export type FrameRateWatcherOptions = {
  x?: TuiSizeValue;
  y?: TuiSizeValue;
  colorFg?: TuiColor;
  colorBg?: TuiColor;
};

export class FrameRateWatcher extends TuiWidgetEntity {
  #x: number;
  #y: number;
  #latestTick = 0n;
  #fps = 0;
  #timer: NodeJS.Timeout | null = null;
  #colorFg: number;
  #colorBg: number;

  constructor(options: FrameRateWatcherOptions = {}) {
    super();
    const rect = this.initRect(options.x, options.y);
    this.#x = rect.x;
    this.#y = rect.y;
    const theme = getTheme();
    this.#colorFg = parseColor(options.colorFg ?? theme.colors.text);
    this.#colorBg = parseColor(options.colorBg ?? theme.colors.surface);
    this.setDraggable(true);

    if (options.colorFg === undefined || options.colorBg === undefined) {
      const trackFg = options.colorFg === undefined;
      const trackBg = options.colorBg === undefined;
      const unsub = onThemeChange(t => {
        if (trackFg) {
          this.#colorFg = parseColor(t.colors.text);
        }

        if (trackBg) {
          this.#colorBg = parseColor(t.colors.surface);
        }
      });
      this.addCleanup(unsub);
    }
  }

  override get zIndex(): number {
    return 999;
  }

  override get rect(): TuiWidgetRect {
    const text = `${this.#fps}fps`;
    return {
      x: this.#x,
      y: this.#y,
      width: text.length,
      height: 1,
    };
  }

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    if (rect.x !== undefined) {
      this.#x = rect.x;
    }

    if (rect.y !== undefined) {
      this.#y = rect.y;
    }
  }

  override containsPoint(x: number, y: number): boolean {
    const text = `${this.#fps}fps`;
    return x >= this.#x
      && x < this.#x + text.length
      && y >= this.#y
      && y < this.#y + 1;
  }

  override emitDrawCommands(buf: DrawListBuffer): void {
    const text = `${this.#fps}fps`;
    const w = text.length;
    buf.pushClip(this.#x, this.#y, w, 1);
    buf.drawRect({
      x: this.#x,
      y: this.#y,
      width: w,
      height: 1,
      bgRgba: this.#colorBg,
    });
    buf.drawText({
      x: this.#x,
      y: this.#y,
      text,
      fgRgba: this.#colorFg,
      bgRgba: this.#colorBg,
    });
    buf.popClip();
  }

  override mounted(): void {
    super.mounted();
    this.#timer = setInterval(() => {
      const currentTick = TUI_CONTEXT_INSTANCE.tick;
      this.#fps = Number(currentTick - this.#latestTick);
      this.#latestTick = currentTick;
    }, 1000);
  }

  override unmounted(): void {
    super.unmounted();
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }
}

export function createFrameRateWatcher(options?: Partial<FrameRateWatcherOptions>) {
  return new FrameRateWatcher(options);
}

export default FrameRateWatcher;
