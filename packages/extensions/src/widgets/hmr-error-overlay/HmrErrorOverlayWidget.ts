import {
  type DrawListBuffer,
  type TuiWidgetRect,
  TUI_CONTEXT_INSTANCE,
  TuiWidgetEntity,
} from '@buntui/core';

type Mountable = {
  mount(widget: TuiWidgetEntity): unknown;
  unmount(widget: TuiWidgetEntity): unknown;
};

const COLOR_BG = 0x18_10_10_F0;
const COLOR_BORDER = 0xF3_86_AB_FF;
const COLOR_TITLE = 0xF3_86_AB_FF;
const COLOR_TEXT = 0xBA_BA_BA_FF;
const COLOR_FILE = 0x89_B4_FA_FF;
const BORDER_SIDES_ALL = 0b1111;
const BORDER_STYLE_DOUBLE = 3;

export type HmrErrorOverlayHandle = {
  dismiss(): void;
};

export function mountHmrErrorOverlay(scene: Mountable, error: Error): HmrErrorOverlayHandle {
  const overlay = new HmrErrorOverlayWidget(error);
  scene.mount(overlay);
  return {
    dismiss() {
      scene.unmount(overlay);
    },
  };
}

class HmrErrorOverlayWidget extends TuiWidgetEntity {
  readonly #lines: string[];
  readonly #titleLine: string;

  constructor(error: Error) {
    super();
    const message = error.message ?? String(error);
    const stack = error.stack?.replace(`${error.name}: ${error.message}`, '').trim() ?? '';
    const messageLines = wrapText(message, 80);
    const stackLines = stack
      ? stack.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 8)
      : [];
    this.#titleLine = '[HMR Error]';
    this.#lines = [
      ...messageLines,
      ...stackLines.length > 0 ? ['', ...stackLines] : [],
    ];
  }

  override get zIndex(): number {
    return 9999;
  }

  override get rect(): TuiWidgetRect {
    const {rows, cols} = TUI_CONTEXT_INSTANCE;
    const padding = 2;
    const maxW = Math.min(cols, 90);
    const maxH = Math.min(rows, this.#lines.length + 4 + (padding * 2));
    const x = Math.max(0, Math.floor((cols - maxW) / 2));
    const y = Math.max(0, Math.floor((rows - maxH) / 2));
    return {
      x, y, width: maxW, height: maxH,
    };
  }

  override containsPoint(x: number, y: number): boolean {
    const {x: rx, y: ry, width, height} = this.rect;
    return x >= rx && x < rx + width && y >= ry && y < ry + height;
  }

  override emitDrawCommands(buf: DrawListBuffer): void {
    const {x: rx, y: ry, width, height} = this.rect;
    const innerX = rx + 2;
    const innerW = width - 4;
    const maxLines = height - 4;

    buf.pushClip(rx, ry, width, height);
    buf.drawRect({
      x: rx, y: ry, width, height, bgRgba: COLOR_BG,
    });
    buf.drawBorder({
      x: rx, y: ry, width, height,
      colorRgba: COLOR_BORDER,
      style: BORDER_STYLE_DOUBLE,
      sides: BORDER_SIDES_ALL,
    });

    buf.drawText({
      x: innerX, y: ry + 1,
      text: truncate(this.#titleLine, innerW),
      fgRgba: COLOR_TITLE,
      bgRgba: COLOR_BG,
    });

    for (let i = 0; i < Math.min(this.#lines.length, maxLines); i++) {
      const line = this.#lines[i]!;
      const isStack = line.startsWith('at ');
      buf.drawText({
        x: innerX,
        y: ry + 3 + i,
        text: truncate(isStack ? `  ${line}` : line, innerW),
        fgRgba: isStack ? COLOR_FILE : COLOR_TEXT,
        bgRgba: COLOR_BG,
      });
    }

    buf.popClip();
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}\u2026`;
}

function wrapText(text: string, maxLength: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split('\n')) {
    let remaining = rawLine;
    while (remaining.length > maxLength) {
      lines.push(remaining.slice(0, maxLength));
      remaining = remaining.slice(maxLength);
    }

    lines.push(remaining);
  }

  return lines;
}

export default HmrErrorOverlayWidget;
