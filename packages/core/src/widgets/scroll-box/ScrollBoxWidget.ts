import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {parseColor} from '../../utils/color';
import {getTheme} from '../../theme/provider';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/resolve';
import type {TuiWidgetRect, TuiWidgetSize} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import type {TuiWidgetEntity} from '../TuiWidgetEntity';
import {type BoxWidget, createBox} from '../box/BoxWidget';
import {
  computeScrollbarGeometry,
  renderScrollbar,
  scrollbarHitTest,
  computeThumbDragOffset, type ScrollbarHitTest,
} from '../scrollbar-helper';
import type {ScrollBoxWidgetOptions} from './types';

export class ScrollBoxWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #scrollOffsetY = 0;
  #layoutDirty = true;
  readonly #layoutChildren: TuiWidgetEntity[] = [];
  readonly #innerBox: BoxWidget;

  #gap: number;
  readonly #scrollSpeed: number;
  #alwaysShowScrollbar: boolean;
  #colorScrollbar: number;
  #colorScrollbarTrack: number;

  #dragScrolling = false;
  #dragStartY = 0;
  #dragStartOffset = 0;

  #thumbDragging = false;
  #thumbDragStartY = 0;
  #thumbDragStartOffset = 0;

  constructor(options: ScrollBoxWidgetOptions) {
    super();
    this.#rect = this.initRect(options.x, options.y, options.width, options.height, {width: 20, height: 10});

    this.#innerBox = createBox({
      x: this.#rect.x,
      y: this.#rect.y,
      width: this.#rect.width,
      height: this.#rect.height,
      colorBg: options.colorBg,
      colorBorder: options.colorBorder,
      borderStyle: options.borderStyle,
      borderTop: options.borderTop,
      borderRight: options.borderRight,
      borderBottom: options.borderBottom,
      borderLeft: options.borderLeft,
      colorShadow: options.colorShadow,
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
    this.#colorScrollbar = parseColor(options.colorScrollbar ?? theme.colors.scrollbar);
    this.#colorScrollbarTrack = parseColor(options.colorScrollbarTrack ?? theme.colors.scrollbarTrack);

    this.on('wheel', data => {
      this.scrollBy(data.wheelDeltaY * this.#scrollSpeed);
    });

    this.on('mousedown', data => {
      const hit = this.#scrollbarHitTest();
      const result = hit ? scrollbarHitTest(data.x, data.y, hit) : {type: 'none'} as const;
      switch (result.type) {
        case 'thumb': {
          this.#thumbDragging = true;
          this.#thumbDragStartY = data.y;
          this.#thumbDragStartOffset = this.#scrollOffsetY;

          break;
        }

        case 'track-above': {
          this.scrollBy(-this.#computeViewport().height);

          break;
        }

        case 'track-below': {
          this.scrollBy(this.#computeViewport().height);

          break;
        }

        case 'none': {
          this.#dragScrolling = true;
          this.#dragStartY = data.y;
          this.#dragStartOffset = this.#scrollOffsetY;
          break;
        }
      }
    });

    this.on('mousemove', data => {
      if (this.#thumbDragging) {
        if ((data.buttons ?? 0) === 0) {
          this.#thumbDragging = false;
          return;
        }

        const delta = data.y - this.#thumbDragStartY;
        const viewport = this.#computeViewport();
        const geometry = computeScrollbarGeometry(viewport.height, this.#computeContentHeight(), this.#thumbDragStartOffset);
        this.scrollTo(computeThumbDragOffset(delta, this.#thumbDragStartOffset, geometry));
        return;
      }

      if (!this.#dragScrolling) {
        return;
      }

      if ((data.buttons ?? 0) === 0) {
        this.#dragScrolling = false;
        return;
      }

      const delta = data.y - this.#dragStartY;
      this.scrollTo(this.#dragStartOffset + delta);
    });

    this.on('mouseup', () => {
      this.#dragScrolling = false;
      this.#thumbDragging = false;
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

  override handleActiveKey(event: KeyboardEvent): void {
    const key = event.key!;
    const viewport = this.#computeViewport();

    switch (key) {
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
      this.dispatch('scroll', {scrollOffsetY: clamped, maxScrollY: this.#maxScrollOffset()});
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

  scrollIntoView(child: TuiWidgetEntity): void {
    const index = this.#layoutChildren.indexOf(child);
    if (index === -1) {
      return;
    }

    const viewport = this.#computeViewport();
    let childTop = 0;
    for (let i = 0; i < index; i++) {
      const c = this.#layoutChildren[i]!;
      const intrinsic = c.intrinsicSize();
      childTop += (intrinsic?.height ?? c.rect.height) + this.#gap;
    }

    const c = this.#layoutChildren[index]!;
    const intrinsic = c.intrinsicSize();
    const childHeight = intrinsic?.height ?? c.rect.height;
    const childBottom = childTop + childHeight;

    if (childTop < this.#scrollOffsetY) {
      this.scrollTo(childTop);
    } else if (childBottom > this.#scrollOffsetY + viewport.height) {
      this.scrollTo(childBottom - viewport.height);
    }
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

  updateThemeColors(resolved: Record<string, unknown>): void {
    if (resolved.colorBg !== undefined) {
      this.updateColor({colorBg: parseColor(resolved.colorBg as number)});
    }

    if (resolved.colorBorder !== undefined) {
      this.updateBorder({colorBorder: parseColor(resolved.colorBorder as number)});
    }

    if (resolved.colorScrollbar !== undefined) {
      this.setColorScrollbar(parseColor(resolved.colorScrollbar as number));
    }

    if (resolved.colorScrollbarTrack !== undefined) {
      this.setColorScrollbarTrack(parseColor(resolved.colorScrollbarTrack as number));
    }
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

  setGap(gap: number): void {
    this.#gap = gap;
    this.#layoutDirty = true;
  }

  setAlwaysShowScrollbar(value: boolean): void {
    this.#alwaysShowScrollbar = value;
  }

  setColorScrollbar(value: number): void {
    this.#colorScrollbar = parseColor(value);
  }

  setColorScrollbarTrack(value: number): void {
    this.#colorScrollbarTrack = parseColor(value);
  }

  // -- Child management --

  override addChild(child: TuiWidgetEntity): void {
    super.addChild(child);
    this.#layoutChildren.push(child);
    this.#layoutDirty = true;
  }

  override removeChild(child: TuiWidgetEntity): void {
    // eslint-disable-next-line unicorn/prefer-dom-node-remove
    super.removeChild(child);
    const index = this.#layoutChildren.indexOf(child);
    if (index !== -1) {
      this.#layoutChildren.splice(index, 1);
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

    for (const child of this.#layoutChildren) {
      if (!child.visible) {
        continue;
      }

      const {x: childX, y: childY, width: childW, height: childH} = child.rect;

      if (childY + childH <= viewport.y || childY >= viewport.y + viewport.height) {
        continue;
      }

      if (childX >= viewport.x + viewport.width || childX + childW <= viewport.x) {
        continue;
      }

      child.emitDrawCommands(buffer);
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
    for (const child of this.#layoutChildren) {
      const intrinsic = child.intrinsicSize();
      total += intrinsic?.height ?? child.rect.height;
    }

    total += Math.max(0, this.#layoutChildren.length - 1) * this.#gap;
    return total;
  }

  #maxScrollOffset(): number {
    const viewport = this.#computeViewport();
    return Math.max(0, this.#computeContentHeight() - viewport.height);
  }

  #computeLayout(): void {
    const children = this.#layoutChildren;
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

    const geometry = computeScrollbarGeometry(viewport.height, contentHeight, this.#scrollOffsetY);
    renderScrollbar({
      buffer, x: viewport.x + viewport.width, trackY: viewport.y, trackHeight: viewport.height, geometry, thumbColor: this.#colorScrollbar, trackColor: this.#colorScrollbarTrack,
    });
  }

  #scrollbarHitTest(): ScrollbarHitTest | undefined {
    const maxScroll = this.#maxScrollOffset();
    if (maxScroll === 0 && !this.#alwaysShowScrollbar) {
      return undefined;
    }

    const viewport = this.#computeViewport();
    const contentHeight = this.#computeContentHeight();
    if (contentHeight <= 0) {
      return undefined;
    }

    const geometry = computeScrollbarGeometry(viewport.height, contentHeight, this.#scrollOffsetY);
    return {
      x: viewport.x + viewport.width,
      trackY: viewport.y,
      trackHeight: viewport.height,
      thumbY: viewport.y + geometry.thumbOffset,
      thumbSize: geometry.thumbSize,
    };
  }
}

const SCROLLBOX_TOKEN_MAP = {
  colorBg: 'background',
  colorBorder: 'border',
  colorScrollbar: 'scrollbar',
  colorScrollbarTrack: 'scrollbarTrack',
} as const;

function getDefaultScrollBoxOptions(): ScrollBoxWidgetOptions {
  return {
    x: 0,
    y: 0,
    width: 20,
    height: 10,
    borderStyle: 'solid',
    borderTop: true,
    borderRight: true,
    borderBottom: true,
    borderLeft: true,
    gap: 0,
    scrollSpeed: 3,
    alwaysShowScrollbar: false,
    ...resolveWidgetColors(SCROLLBOX_TOKEN_MAP),
  };
}

export function createScrollBoxWidget(options: Partial<ScrollBoxWidgetOptions> = {}): ScrollBoxWidget {
  const widget = new ScrollBoxWidget({...getDefaultScrollBoxOptions(), ...options});
  bindThemeToWidget(widget, SCROLLBOX_TOKEN_MAP, options ?? {}, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default ScrollBoxWidget;
