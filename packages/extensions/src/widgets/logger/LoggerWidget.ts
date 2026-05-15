import {
  type TuiColor,
  BoxWidget,
  TextWidget,
  ScrollBoxWidget,
  TuiWidgetEntity,
  parseColor,
  getTheme,
} from '@buntui/core';

export type LoggerWidgetOptions = {
  x?: number;
  y?: number;
  panelWidth?: number;
  panelHeight?: number;
  maxLines?: number;
  timestamp?: boolean;
  colorFg?: TuiColor;
  colorBg?: TuiColor;
  label?: string;
  hijack?: boolean;
};

export class LoggerWidget extends TuiWidgetEntity {
  readonly #toggleBtn: BoxWidget;
  readonly #btnLabel: TextWidget;
  readonly #panel: ScrollBoxWidget;
  readonly #messages: string[] = [];
  readonly #maxLines: number;
  readonly #showTimestamp: boolean;
  readonly #colorFg: number;
  readonly #panelWidth: number;
  readonly #panelHeight: number;
  #panelVisible = false;
  #scrollPending = false;
  #restoreConsole: (() => void) | null = null;

  constructor(options: LoggerWidgetOptions = {}) {
    super();
    const theme = getTheme();
    this.#maxLines = options.maxLines ?? 200;
    this.#showTimestamp = options.timestamp ?? true;
    this.#colorFg = parseColor(options.colorFg ?? theme.colors.text);
    this.#panelWidth = options.panelWidth ?? 40;
    this.#panelHeight = options.panelHeight ?? 15;
    const colorBg = parseColor(options.colorBg ?? 0x1E_1E_2E_CC);
    const label = options.label ?? '◉';

    // Floating toggle button
    this.#toggleBtn = new BoxWidget({
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: label.length + 2,
      height: 1,
      colorBg,
      border: false,
      draggable: true,
      styleZIndex: 999,
    });

    this.#btnLabel = new TextWidget({
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: label.length + 2,
      height: 1,
      value: ` ${label}`,
      colorFg: this.#colorFg,
      colorBg: 0x00_00_00_00,
    });
    this.#toggleBtn.addChild(this.#btnLabel);

    // Log panel
    this.#panel = new ScrollBoxWidget({
      x: 0,
      y: 0,
      width: this.#panelWidth,
      height: this.#panelHeight,
      colorBg: (colorBg & 0xFF_FF_FF_00) | 0xDD,
      borderTop: true,
      borderRight: true,
      borderBottom: true,
      borderLeft: true,
      borderStyle: 'solid',
      borderColor: this.#colorFg,
    });
    this.#panel.setVisible(false);

    this.addChild(this.#toggleBtn);
    this.addChild(this.#panel);

    this.#toggleBtn.on('click', () => {
      this.toggle();
    });

    if (options.hijack) {
      this.hijackConsole();
    }
  }

  // -- Public API --

  log(message: string): void {
    const line = this.#showTimestamp ? `[${this.#timestamp()}] ${message}` : message;
    this.#messages.push(line);
    if (this.#messages.length > this.#maxLines) {
      this.#messages.shift();
    }

    const textWidget = new TextWidget({
      x: 0,
      y: 0,
      width: this.#panelWidth - 2,
      height: 1,
      value: line,
      colorFg: this.#colorFg,
      colorBg: 0x00_00_00_00,
    });
    this.#panel.addChild(textWidget);
    this.#scrollPending = true;
  }

  clear(): void {
    this.#messages.length = 0;
    const {children} = this.#panel;
    for (let i = children.length - 1; i >= 0; i--) {
      // eslint-disable-next-line unicorn/prefer-dom-node-remove
      this.#panel.removeChild(children[i]!);
    }
  }

  toggle(): void {
    this.#panelVisible = !this.#panelVisible;
    this.#panel.setVisible(this.#panelVisible);
    if (this.#panelVisible) {
      this.#updatePanelPosition();
      this.#scrollPending = true;
    }
  }

  get messages(): readonly string[] {
    return this.#messages;
  }

  get isOpen(): boolean {
    return this.#panelVisible;
  }

  /**
   * Replace console.log with a wrapper that sends output to this logger.
   * Call restoreConsole() to undo.
   */
  hijackConsole(): void {
    const original = console.log;
    this.#restoreConsole = () => {
      console.log = original;
    };

    console.log = (...args: unknown[]) => {
      this.log(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
    };
  }

  restoreConsole(): void {
    const restore = this.#restoreConsole;
    this.#restoreConsole = null;
    restore?.();
  }

  // -- Overrides --

  // -- Overrides --

  override get zIndex(): number {
    return 999;
  }

  override containsPoint(x: number, y: number): boolean {
    if (this.#toggleBtn.containsPoint(x, y)) {
      return true;
    }

    return this.#panelVisible && this.#panel.containsPoint(x, y);
  }

  override emitDrawCommands(buf: Parameters<TuiWidgetEntity['emitDrawCommands']>[0]): void {
    this.#toggleBtn.emitDrawCommands(buf);

    if (this.#panelVisible) {
      this.#updatePanelPosition();
      if (this.#scrollPending) {
        this.#panel.scrollToBottom();
        this.#scrollPending = false;
      }

      this.#panel.emitDrawCommands(buf);
    }
  }

  // -- Private --

  #updatePanelPosition(): void {
    const {x: bx, y: by, height: bh} = this.#toggleBtn.rect;
    this.#panel.updateRect({
      x: bx,
      y: by + bh,
    });
  }

  #timestamp(): string {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}

export function createLoggerWidget(options?: Partial<LoggerWidgetOptions>): LoggerWidget {
  return new LoggerWidget(options);
}

export default LoggerWidget;
