import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {TUI_CONTEXT_INSTANCE} from '../../extern/app/TuiContext';
import type {OverlayManager} from '../../overlay/OverlayManager';
import type {OverlayHandle} from '../../overlay/types';
import {parseColor, type TuiColor} from '../../utils/color';
import type {TuiWidgetRect} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import type {ModalWidgetOptions} from './types';

const DEFAULT_BACKDROP_RGBA = 0x00_00_00_AA;
const DEFAULT_CONTENT_BG = 0x1A_1B_26_FF;
const BORDER_SIDES_ALL = 0b1111;
const BORDER_STYLE_ROUNDED = 2;

type ModalHost = {
  mount(widget: TuiWidgetEntity): void;
  unmount(widget: TuiWidgetEntity): void;
  getOverlayManager(): OverlayManager;
};

export function createModalWidget(options?: ModalWidgetOptions): ModalWidget {
  return new ModalWidget(options);
}

export class ModalWidget extends TuiWidgetEntity {
  readonly #contentWidth: number;
  readonly #contentHeight: number;
  readonly #backdropRgba: number;
  readonly #closeOnBackdrop: boolean;
  readonly #closeOnEscape: boolean;
  #handle: OverlayHandle | undefined;
  #host: ModalHost | undefined;
  #open = false;

  constructor(options: ModalWidgetOptions = {}) {
    super();
    this.#contentWidth = options.width ?? 40;
    this.#contentHeight = options.height ?? 10;
    this.#backdropRgba = options.backdropRgba
      ?? (options.backdropColor ? parseColor(options.backdropColor) : DEFAULT_BACKDROP_RGBA);
    this.#closeOnBackdrop = options.closeOnBackdrop ?? true;
    this.#closeOnEscape = options.closeOnEscape ?? true;
  }

  override mounted(): void {
    super.mounted();
    if (this.referenceCount === 1) {
      this.#registerEventHandlers();
    }
  }

  override get rect(): TuiWidgetRect {
    const {cols, rows} = TUI_CONTEXT_INSTANCE;
    const x = Math.max(0, Math.floor((cols - this.#contentWidth) / 2));
    const y = Math.max(0, Math.floor((rows - this.#contentHeight) / 2));
    return {
      x,
      y,
      width: this.#contentWidth,
      height: this.#contentHeight,
    };
  }

  override containsPoint(
    _x: number,
    _y: number,
  ): boolean {
    return this.#open;
  }

  get isOpen(): boolean {
    return this.#open;
  }

  open(host: ModalHost): void {
    if (this.#open) {
      return;
    }

    this.#host = host;
    host.mount(this);
    this.#handle = host.getOverlayManager().open(this, {
      trapFocus: true,
    });
    this.#open = true;
  }

  close(): void {
    if (!this.#open) {
      return;
    }

    this.#open = false;
    const savedHandle = this.#handle;
    const savedHost = this.#host;
    this.#handle = undefined;
    this.#host = undefined;
    if (savedHandle) {
      savedHandle.close();
    }

    this.dispatch('closed', undefined);

    if (savedHost) {
      savedHost.unmount(this);
    }
  }

  override emitDrawCommands(buf: DrawListBuffer): void {
    if (!this.#open) {
      return;
    }

    const {cols, rows} = TUI_CONTEXT_INSTANCE;
    const {x, y, width, height} = this.rect;

    buf.drawRect({
      x: 0,
      y: 0,
      width: cols,
      height: rows,
      bgRgba: this.#backdropRgba,
    });

    buf.pushClip(x, y, width, height);
    buf.drawRect({
      x,
      y,
      width,
      height,
      bgRgba: DEFAULT_CONTENT_BG,
    });
    buf.drawBorder({
      x,
      y,
      width,
      height,
      colorRgba: 0x41_41_5E_FF,
      style: BORDER_STYLE_ROUNDED,
      sides: BORDER_SIDES_ALL,
    });
    this.renderChildren(buf);
    buf.popClip();
  }

  #registerEventHandlers(): void {
    this.on('click', data => {
      if (!this.#closeOnBackdrop) {
        return;
      }

      if (!this.#isInContentArea(data.x, data.y)) {
        this.close();
      }
    });

    this.on('key', event => {
      if (!this.#closeOnEscape) {
        return;
      }

      if (event.key === 'Escape') {
        this.close();
      }
    });
  }

  #isInContentArea(px: number, py: number): boolean {
    const {x, y, width, height} = this.rect;
    return px >= x && px < x + width && py >= y && py < y + height;
  }
}
