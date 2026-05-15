import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {parseColor} from '../../utils/color';
import {getTheme} from '../../theme/provider';
import {extractPercentSpec, isPercent} from '../../utils/percent';
import type {Focusable} from '../Focusable';
import type {TuiWidgetRect, TuiWidgetSize} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import {type BoxWidget, createBox} from '../box/BoxWidget';
import type {ScrollBoxWidgetOptions} from './types';

export class ScrollBoxWidget extends TuiWidgetEntity implements Focusable {
  readonly #rect: TuiWidgetRect;
  #scrollOffsetY = 0;
  #layoutDirty = true;
  readonly #ownChildren: TuiWidgetEntity[] = [];
  readonly #innerBox: BoxWidget;

  readonly #gap: number;
  readonly #scrollSpeed: number;
  readonly #alwaysShowScrollbar: boolean;
  readonly #scrollbarColor: number;
  readonly #scrollbarTrackColor: number;

  #focused = false;

  constructor(options: ScrollBoxWidgetOptions) {
    super();
    const spec = extractPercentSpec(options.x, options.y, options.width, options.height);
    if (spec) {
      this.setPercentSpec(spec);
    }

    this.#rect = {
      x: isPercent(options.x) ? 0 : (options.x ?? 0),
      y: isPercent(options.y) ? 0 : (options.y ?? 0),
      width: isPercent(options.width) ? 0 : (options.width ?? 20),
      height: isPercent(options.height) ? 0 : (options.height ?? 10),
    };

    this.#innerBox = createBox({
      x: this.#rect.x,
      y: this.#rect.y,
      width: this.#rect.width,
      height: this.#rect.height,
      colorBg: options.colorBg,
      borderColor: options.borderColor,
      borderStyle: options.borderStyle,
      borderTop: options.borderTop,
      borderRight: options.borderRight,
      borderBottom: options.borderBottom,
      borderLeft: options.borderLeft,
      shadowColor: options.shadowColor,
      shadowOffsetX: options.shadowOffsetX,
      shadowOffsetY: options.shadowOffsetY,
      shadowCovered: options.shadowCovered,
      paddingTop: options.paddingTop,
      paddingRight: options.paddingRight,
      paddingBottom: options.paddingBottom,
      paddingLeft: options.paddingLeft,
    });

    this.#gap = options.gap ?? 0;
    this.#scrollSpeed = options.scrollSpeed ?? 3;
    this.#alwaysShowScrollbar = options.alwaysShowScrollbar ?? false;
    const theme = getTheme();
    this.#scrollbarColor = parseColor(options.scrollbarColor ?? theme.colors.scrollbar);
    this.#scrollbarTrackColor = parseColor(options.scrollbarTrackColor ?? theme.colors.scrollbarTrack);

    this.on('wheel', data => {
      this.scrollBy(data.wheelDeltaY * this.#scrollSpeed);
    });
  }

  // -- Accessors --

  override get rect(): TuiWidgetRect {
    return this.#rect;
  }

  get scrollOffsetY(): number {
    return this.#scrollOffsetY;
  }

  get maxScrollY(): number {
    return this.#maxScrollOffset();
  }

  get acceptsFocus(): boolean {
    return true;
  }

  // -- Focusable --

  focus(): void {
    this.#focused = true;
    this.dispatch('focus', undefined);
  }

  blur(): void {
    this.#focused = false;
    this.dispatch('blur', undefined);
  }

  override unmounted(): void {
    if (this.#focused) {
      this.blur();
    }

    super.unmounted();
  }

  handleKey(event: KeyboardEvent): void {
    if (event.key === undefined) {
      return;
    }

    const viewport = this.#computeViewport();

    switch (event.key) {
      case 'ArrowUp': {
        this.scrollBy(-1);
        break;
      }

      case 'ArrowDown': {
        this.scrollBy(1);
        break;
      }

      case 'PageUp': {
        this.scrollBy(-viewport.height);
        break;
      }

      case 'PageDown': {
        this.scrollBy(viewport.height);
        break;
      }

      case 'Home': {
        this.scrollTo(0);
        break;
      }

      case 'End': {
        this.scrollTo(this.#maxScrollOffset());
        break;
      }

      default: {
        break;
      }
    }
  }

  // -- Scroll API --

  scrollTo(offset: number): void {
    const clamped = Math.max(0, Math.min(offset, this.#maxScrollOffset()));
    if (clamped !== this.#scrollOffsetY) {
      this.#scrollOffsetY = clamped;
      this.#layoutDirty = true;
    }
  }

  scrollToTop(): void {
    this.scrollTo(0);
  }

  scrollToBottom(): void {
    this.scrollTo(this.#maxScrollOffset());
  }

  scrollBy(delta: number): void {
    this.scrollTo(this.#scrollOffsetY + delta);
  }

  // -- Update methods --

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    const oldX = this.#rect.x;
    const oldY = this.#rect.y;
    Object.assign(this.#rect, rect);
    this.#layoutDirty = true;

    this.#innerBox.updateRect({
      x: this.#rect.x,
      y: this.#rect.y,
      width: this.#rect.width,
      height: this.#rect.height,
    });

    this.propagatePositionDelta(this.#rect.x - oldX, this.#rect.y - oldY);
  }

  // -- Visual chrome update methods (delegate to innerBox) --

  updateColor(color: Parameters<BoxWidget['updateColor']>[0]): void {
    this.#innerBox.updateColor(color);
  }

  updateBorder(border: Parameters<BoxWidget['updateBorder']>[0]): void {
    this.#innerBox.updateBorder(border);
    this.#layoutDirty = true;
  }

  updateShadow(shadow: Parameters<BoxWidget['updateShadow']>[0]): void {
    this.#innerBox.updateShadow(shadow);
  }

  updatePadding(padding: Parameters<BoxWidget['updatePadding']>[0]): void {
    this.#innerBox.updatePadding(padding);
    this.#layoutDirty = true;
  }

  // -- Child management --

  override addChild(child: TuiWidgetEntity): void {
    super.addChild(child);
    this.#ownChildren.push(child);
    this.#layoutDirty = true;
  }

  override removeChild(child: TuiWidgetEntity): void {
    // eslint-disable-next-line unicorn/prefer-dom-node-remove
    super.removeChild(child);
    const index = this.#ownChildren.indexOf(child);
    if (index !== -1) {
      this.#ownChildren.splice(index, 1);
    }

    this.#layoutDirty = true;
  }

  // -- Intrinsic size --

  override intrinsicSize(): TuiWidgetSize | undefined {
    return undefined;
  }

  // -- Rendering --

  override emitDrawCommands(buffer: DrawListBuffer): void {
    if (this.#layoutDirty) {
      this.#computeLayout();
    }

    const {x, y, width, height} = this.#rect;

    buffer.pushClip(x, y, width, height);
    this.#innerBox.emitDrawCommands(buffer);

    const viewport = this.#computeViewport();
    buffer.pushClip(viewport.x, viewport.y, viewport.width, viewport.height);

    for (const child of this.#ownChildren) {
      if (!child.visible) {
        continue;
      }

      const {x: childX, y: childY, width: childW, height: childH} = child.rect;

      // Skip children entirely outside the viewport
      if (childY + childH <= viewport.y || childY >= viewport.y + viewport.height) {
        continue;
      }

      if (childX >= viewport.x + viewport.width || childX + childW <= viewport.x) {
        continue;
      }

      // Clamp negative coordinates to avoid U16 overflow in DrawList,
      // then restore original rect after rendering. Viewport clip handles visual cropping.
      const clampedX = Math.max(0, childX);
      const clampedY = Math.max(0, childY);
      const needsClamp = clampedX !== childX || clampedY !== childY;

      if (needsClamp) {
        child.updateRect({
          x: clampedX,
          y: clampedY,
          width: childW - (clampedX - childX),
          height: childH - (clampedY - childY),
        });
      }

      child.emitDrawCommands(buffer);

      if (needsClamp) {
        child.updateRect({
          x: childX,
          y: childY,
          width: childW,
          height: childH,
        });
      }
    }

    buffer.popClip();
    this.#renderScrollbar(buffer);
    buffer.popClip();
  }

  // -- Internal helpers --

  #computeViewport(): TuiWidgetRect & {width: number; height: number} {
    const {x, y, width, height} = this.#rect;
    const {paddingTop, paddingLeft, paddingRight, paddingBottom} = this.#innerBox.padding;
    const {borderTop, borderRight, borderBottom, borderLeft} = this.#innerBox.border;

    const borderH = (borderLeft ? 1 : 0) + (borderRight ? 1 : 0);
    const borderV = (borderTop ? 1 : 0) + (borderBottom ? 1 : 0);

    const innerX = x + paddingLeft + (borderLeft ? 1 : 0);
    const innerY = y + paddingTop + (borderTop ? 1 : 0);
    const innerWidth = width - paddingLeft - paddingRight - borderH - 1; // -1 for scrollbar column
    const innerHeight = height - paddingTop - paddingBottom - borderV;

    return {
      x: innerX, y: innerY, width: innerWidth, height: innerHeight,
    };
  }

  #computeContentHeight(): number {
    let total = 0;
    for (const child of this.#ownChildren) {
      const intrinsic = child.intrinsicSize();
      total += intrinsic?.height ?? child.rect.height;
    }

    total += Math.max(0, this.#ownChildren.length - 1) * this.#gap;
    return total;
  }

  #maxScrollOffset(): number {
    const viewport = this.#computeViewport();
    return Math.max(0, this.#computeContentHeight() - viewport.height);
  }

  #computeLayout(): void {
    const children = this.#ownChildren;
    if (children.length === 0) {
      this.#layoutDirty = false;
      return;
    }

    const viewport = this.#computeViewport();
    let cumulativeY = 0;

    for (const child of children) {
      const intrinsic = child.intrinsicSize();
      const childHeight = intrinsic?.height ?? child.rect.height;
      const childY = viewport.y + cumulativeY - this.#scrollOffsetY;

      child.updateRect({
        x: viewport.x,
        y: childY,
        width: viewport.width,
        height: childHeight,
      });

      cumulativeY += childHeight + this.#gap;
    }

    this.#layoutDirty = false;
  }

  #renderScrollbar(buffer: DrawListBuffer): void {
    const maxScroll = this.#maxScrollOffset();
    if (maxScroll === 0 && !this.#alwaysShowScrollbar) {
      return;
    }

    const viewport = this.#computeViewport();
    const contentHeight = this.#computeContentHeight();
    if (contentHeight <= 0) {
      return;
    }

    const scrollbarX = viewport.x + viewport.width;
    const thumbRatio = viewport.height / contentHeight;
    const thumbSize = Math.max(1, Math.round(thumbRatio * viewport.height));
    const scrollableRange = viewport.height - thumbSize;
    const thumbOffset = maxScroll > 0
      ? Math.round((this.#scrollOffsetY / maxScroll) * scrollableRange)
      : 0;

    for (let row = 0; row < viewport.height; row++) {
      const isThumb = row >= thumbOffset && row < thumbOffset + thumbSize;
      buffer.drawChar({
        x: scrollbarX,
        y: viewport.y + row,
        char: isThumb ? 0x25_88 : 0x25_02,
        fgRgba: isThumb ? this.#scrollbarColor : this.#scrollbarTrackColor,
        bgRgba: 0x00_00_00_00,
      });
    }
  }
}

const DEFAULT_SCROLL_BOX_OPTIONS: ScrollBoxWidgetOptions = {
  x: 0,
  y: 0,
  width: 20,
  height: 10,
  colorBg: 0x00_00_00_FF,
  borderColor: 0xFF_FF_FF_FF,
  borderStyle: 'solid',
  borderTop: true,
  borderRight: true,
  borderBottom: true,
  borderLeft: true,
  gap: 0,
  scrollSpeed: 3,
  alwaysShowScrollbar: false,
  scrollbarColor: 0x58_5B_70_FF,
  scrollbarTrackColor: 0x31_32_44_FF,
};

export function createScrollBoxWidget(options: Partial<ScrollBoxWidgetOptions> = {}): ScrollBoxWidget {
  return new ScrollBoxWidget({...DEFAULT_SCROLL_BOX_OPTIONS, ...options});
}

export default ScrollBoxWidget;
