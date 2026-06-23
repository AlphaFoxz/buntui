import type {DrawListBuffer} from '../../draw-list/DrawListBuffer';
import {type KeyboardEvent} from '../../events/types';
import {parseColor} from '../../utils/color';
import {getTheme} from '../../theme/store';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/binding';
import {resolveThemedOverrides} from '../../theme/color-ref';
import {
  type TuiWidgetRect,
  type TuiWidgetSize,
  type TuiLayoutDirection,
  type TuiLayoutAlignment,
  type TuiJustifyContent,
  type TuiLayoutDirectionName,
  type TuiLayoutAlignmentName,
  type TuiJustifyContentName,
  type TuiFlexWrap,
  type TuiFlexWrapName,
  type TuiAlignContent,
  type TuiAlignContentName,
  resolveLayoutDirection,
  resolveLayoutAlignment,
  resolveJustifyContent,
  resolveFlexWrap,
  resolveAlignContent,
} from '../types';
import {InteractiveWidget} from '../InteractiveWidget';
import type {TuiWidgetEntity} from '../TuiWidgetEntity';
import {computeFlexLayout, resolveFlexBasis} from '../layout-flex';
import {type BoxWidget, createBox} from '../box/BoxWidget';
import {
  computeScrollbarGeometry,
  renderScrollbar,
  renderScrollbarHorizontal,
  scrollbarHitTest,
  scrollbarHitTestHorizontal,
  computeThumbDragOffset,
  type ScrollbarHitTest,
  type ScrollbarHitTestHorizontal,
} from '../scrollbar-helper';
import type {ScrollBoxWidgetOptions} from './types';

type ScrollBoxExtraColors = {scrollbar: number; scrollbarTrack: number};

export class ScrollBoxWidget extends InteractiveWidget {
  readonly #rect: TuiWidgetRect;
  #scrollOffsetY = 0;
  #scrollOffsetX = 0;
  #layoutDirty = true;
  #visibleKey = '';
  readonly #layoutChildren: TuiWidgetEntity[] = [];
  readonly #innerBox: BoxWidget;

  #gap: number;
  #direction: TuiLayoutDirection;
  #align: TuiLayoutAlignment;
  #justifyContent: TuiJustifyContent;
  #flexWrap: TuiFlexWrap;
  #alignContent: TuiAlignContent;
  readonly #scrollSpeed: number;
  #alwaysShowScrollbar: boolean;
  readonly #extraColors: ScrollBoxExtraColors;

  #dragScrolling = false;
  #dragStartY = 0;
  #dragStartX = 0;
  #dragStartOffsetY = 0;
  #dragStartOffsetX = 0;

  #thumbDragging = false;
  #thumbDragStartY = 0;
  #thumbDragStartOffset = 0;

  #thumbDraggingX = false;
  #thumbDragStartX = 0;
  #thumbDragStartOffsetX = 0;

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
    this.#direction = resolveLayoutDirection(options.direction ?? 'vertical');
    this.#align = resolveLayoutAlignment(options.align ?? 'stretch');
    this.#justifyContent = resolveJustifyContent(options.justifyContent ?? 'start');
    this.#flexWrap = resolveFlexWrap(options.flexWrap ?? 'nowrap');
    this.#alignContent = resolveAlignContent(options.alignContent ?? 'start');
    this.#scrollSpeed = options.scrollSpeed ?? 3;
    this.#alwaysShowScrollbar = options.alwaysShowScrollbar ?? false;
    const theme = getTheme();
    this.#extraColors = {
      scrollbar: parseColor(options.colorScrollbar ?? theme.colors.scrollbar),
      scrollbarTrack: parseColor(options.colorScrollbarTrack ?? theme.colors.scrollbarTrack),
    };

    this.on('wheel', data => {
      const horizontal = data.shiftKey;
      const before = horizontal ? this.#scrollOffsetX : this.#scrollOffsetY;
      if (horizontal) {
        this.scrollByX(data.wheelDeltaY * this.#scrollSpeed);
      } else {
        this.scrollBy(data.wheelDeltaY * this.#scrollSpeed);
      }

      const after = horizontal ? this.#scrollOffsetX : this.#scrollOffsetY;
      if (before !== after) {
        this.stopPropagation();
      }
    });

    this.on('mousedown', data => {
      const vHit = this.#scrollbarHitTest();
      if (vHit) {
        const result = scrollbarHitTest(data.x, data.y, vHit);
        switch (result.type) {
          case 'thumb': {
            this.#thumbDragging = true;
            this.#thumbDragStartY = data.y;
            this.#thumbDragStartOffset = this.#scrollOffsetY;
            this.stopPropagation();
            return;
          }

          case 'track-above': {
            this.scrollBy(-this.#computeViewport().height);
            this.stopPropagation();
            return;
          }

          case 'track-below': {
            this.scrollBy(this.#computeViewport().height);
            this.stopPropagation();
            return;
          }

          case 'track-left':
          case 'track-right':
          case 'none': {
            break;
          }

          default: {
            assertNever(result);
          }
        }
      }

      const hHit = this.#horizontalScrollbarHitTest();
      if (hHit) {
        const result = scrollbarHitTestHorizontal(data.x, data.y, hHit);
        switch (result.type) {
          case 'thumb': {
            this.#thumbDraggingX = true;
            this.#thumbDragStartX = data.x;
            this.#thumbDragStartOffsetX = this.#scrollOffsetX;
            this.stopPropagation();
            return;
          }

          case 'track-left': {
            this.scrollByX(-this.#computeViewport().width);
            this.stopPropagation();
            return;
          }

          case 'track-right': {
            this.scrollByX(this.#computeViewport().width);
            this.stopPropagation();
            return;
          }

          case 'track-above':
          case 'track-below':
          case 'none': {
            break;
          }

          default: {
            assertNever(result);
          }
        }
      }

      this.#dragScrolling = true;
      this.#dragStartY = data.y;
      this.#dragStartX = data.x;
      this.#dragStartOffsetY = this.#scrollOffsetY;
      this.#dragStartOffsetX = this.#scrollOffsetX;
      this.stopPropagation();
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
        this.stopPropagation();
        return;
      }

      if (this.#thumbDraggingX) {
        if ((data.buttons ?? 0) === 0) {
          this.#thumbDraggingX = false;
          return;
        }

        const delta = data.x - this.#thumbDragStartX;
        const viewport = this.#computeViewport();
        const geometry = computeScrollbarGeometry(viewport.width, this.#computeContentWidth(), this.#thumbDragStartOffsetX);
        this.scrollToX(computeThumbDragOffset(delta, this.#thumbDragStartOffsetX, geometry));
        this.stopPropagation();
        return;
      }

      if (!this.#dragScrolling) {
        return;
      }

      if ((data.buttons ?? 0) === 0) {
        this.#dragScrolling = false;
        return;
      }

      const deltaY = data.y - this.#dragStartY;
      const deltaX = data.x - this.#dragStartX;
      this.scrollTo(this.#dragStartOffsetY - deltaY);
      this.scrollToX(this.#dragStartOffsetX - deltaX);
      this.stopPropagation();
    });

    this.on('mouseup', () => {
      if (!(this.#dragScrolling || this.#thumbDragging || this.#thumbDraggingX)) {
        return;
      }

      this.#dragScrolling = false;
      this.#thumbDragging = false;
      this.#thumbDraggingX = false;
      this.stopPropagation();
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

  get scrollOffsetX(): number {
    return this.#scrollOffsetX;
  }

  get maxScrollX(): number {
    return this.#maxScrollOffsetX();
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

      case 'ArrowLeft': {
        this.scrollByX(-1);
        break;
      }

      case 'ArrowRight': {
        this.scrollByX(1);
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
      this.#dispatchScroll();
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

  scrollToX(offset: number): void {
    const clamped = Math.max(0, Math.min(offset, this.#maxScrollOffsetX()));
    if (clamped !== this.#scrollOffsetX) {
      this.#scrollOffsetX = clamped;
      this.#layoutDirty = true;
      this.#dispatchScroll();
    }
  }

  scrollToLeft(): void {
    this.scrollToX(0);
  }

  scrollToRight(): void {
    this.scrollToX(this.#maxScrollOffsetX());
  }

  scrollByX(delta: number): void {
    this.scrollToX(this.#scrollOffsetX + delta);
  }

  scrollIntoView(child: TuiWidgetEntity): void {
    const index = this.#layoutChildren.indexOf(child);
    if (index === -1) {
      return;
    }

    const viewport = this.#computeViewport();
    const isVertical = this.#direction === 1 || this.#direction === 3;
    const mainSize = isVertical ? viewport.height : viewport.width;

    let childMainPos = 0;
    for (let i = 0; i < index; i++) {
      childMainPos += resolveFlexBasis(this.#layoutChildren[i]!, isVertical, mainSize) + this.#gap;
    }

    const childMainExtent = resolveFlexBasis(this.#layoutChildren[index]!, isVertical, mainSize);
    const childMainEnd = childMainPos + childMainExtent;

    if (isVertical) {
      if (childMainPos < this.#scrollOffsetY) {
        this.scrollTo(childMainPos);
      } else if (childMainEnd > this.#scrollOffsetY + viewport.height) {
        this.scrollTo(childMainEnd - viewport.height);
      }
    } else if (childMainPos < this.#scrollOffsetX) {
      this.scrollToX(childMainPos);
    } else if (childMainEnd > this.#scrollOffsetX + viewport.width) {
      this.scrollToX(childMainEnd - viewport.width);
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
      this.updateColor({colorBg: parseColor(resolved.colorBg)});
    }

    if (resolved.colorBorder !== undefined) {
      this.updateBorder({colorBorder: parseColor(resolved.colorBorder)});
    }

    if (resolved.colorScrollbar !== undefined) {
      this.setColorScrollbar(parseColor(resolved.colorScrollbar));
    }

    if (resolved.colorScrollbarTrack !== undefined) {
      this.setColorScrollbarTrack(parseColor(resolved.colorScrollbarTrack));
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

  setDirection(direction: TuiLayoutDirectionName): void {
    this.#direction = resolveLayoutDirection(direction);
    this.#layoutDirty = true;
  }

  setAlign(align: TuiLayoutAlignmentName): void {
    this.#align = resolveLayoutAlignment(align);
    this.#layoutDirty = true;
  }

  setJustifyContent(justify: TuiJustifyContentName): void {
    this.#justifyContent = resolveJustifyContent(justify);
    this.#layoutDirty = true;
  }

  setFlexWrap(value: TuiFlexWrapName): void {
    this.#flexWrap = resolveFlexWrap(value);
    this.#layoutDirty = true;
  }

  setAlignContent(value: TuiAlignContentName): void {
    this.#alignContent = resolveAlignContent(value);
    this.#layoutDirty = true;
  }

  setAlwaysShowScrollbar(value: boolean): void {
    this.#alwaysShowScrollbar = value;
  }

  setColorScrollbar(value: number): void {
    this.#extraColors.scrollbar = this._resolveColorValue(value, 'colorScrollbar');
  }

  setColorScrollbarTrack(value: number): void {
    this.#extraColors.scrollbarTrack = this._resolveColorValue(value, 'colorScrollbarTrack');
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
    // A child toggling visibility (e.g. v-show) changes the flex layout and the
    // scrollable extent, but setVisible() does not notify the parent. Detect a
    // visibility change here and force a relayout so invisible children stop
    // occupying layout space (display:none semantics).
    const visibleKey = this.#layoutChildren.map(c => (c.visible ? '1' : '0')).join('');
    if (visibleKey !== this.#visibleKey) {
      this.#visibleKey = visibleKey;
      this.#layoutDirty = true;
    }

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
    this.#renderHorizontalScrollbar(buffer);
    buffer.popClip();
  }

  // -- Internal helpers --

  #dispatchScroll(): void {
    this.dispatch('scroll', {
      scrollOffsetY: this.#scrollOffsetY,
      maxScrollY: this.#maxScrollOffset(),
      scrollOffsetX: this.#scrollOffsetX,
      maxScrollX: this.#maxScrollOffsetX(),
    });
  }

  #computeViewport(): TuiWidgetRect & {width: number; height: number} {
    const {x, y, width, height} = this.#rect;
    const {paddingTop, paddingLeft, paddingRight, paddingBottom} = this.#innerBox.padding;
    const {borderTop, borderRight, borderBottom, borderLeft} = this.#innerBox.border;

    const borderH = (borderLeft ? 1 : 0) + (borderRight ? 1 : 0);
    const borderV = (borderTop ? 1 : 0) + (borderBottom ? 1 : 0);

    const innerX = x + paddingLeft + (borderLeft ? 1 : 0);
    const innerY = y + paddingTop + (borderTop ? 1 : 0);
    const innerWidth = width - paddingLeft - paddingRight - borderH;
    const innerHeight = height - paddingTop - paddingBottom - borderV;

    return {
      x: innerX, y: innerY, width: innerWidth, height: innerHeight,
    };
  }

  // -- Content extent (post-layout, flex-aware) --

  #computeContentHeight(): number {
    const children = this.#layoutChildren.filter(c => c.visible);
    let total = 0;
    for (const child of children) {
      let h: number;
      if (child.hasExplicitHeight) {
        h = child.rect.height;
      } else {
        const intrinsic = child.intrinsicSize();
        h = intrinsic?.height ?? child.rect.height;
      }

      total += h;
    }

    total += Math.max(0, children.length - 1) * this.#gap;
    return total;
  }

  #computeContentWidth(): number {
    const viewport = this.#computeViewport();
    let max = viewport.width;
    for (const child of this.#layoutChildren) {
      if (!child.visible) {
        continue;
      }

      let w: number;
      if (child.hasExplicitWidth) {
        w = child.rect.width;
      } else {
        const intrinsic = child.intrinsicSize();
        w = intrinsic?.width ?? child.rect.width;
      }

      if (w > max) {
        max = w;
      }
    }

    return max;
  }

  #maxScrollOffset(): number {
    const viewport = this.#computeViewport();
    return Math.max(0, this.#computeContentHeight() - viewport.height);
  }

  #maxScrollOffsetX(): number {
    const viewport = this.#computeViewport();
    return Math.max(0, this.#computeContentWidth() - viewport.width);
  }

  #computeLayout(): void {
    const children = this.#layoutChildren.filter(c => c.visible);
    if (children.length === 0) {
      this.#layoutDirty = false;
      return;
    }

    const viewport = this.#computeViewport();
    const contentX = viewport.x;
    const contentY = viewport.y;
    const contentWidth = viewport.width;
    const contentHeight = viewport.height;

    // Re-clamp scroll offsets against the current content extent. A stale offset
    // (e.g. after swapping child views via v-if) would otherwise push the new,
    // shorter content off the viewport and leave it blank.
    const maxY = this.#maxScrollOffset();
    if (this.#scrollOffsetY > maxY) {
      this.#scrollOffsetY = maxY;
    }

    const maxX = this.#maxScrollOffsetX();
    if (this.#scrollOffsetX > maxX) {
      this.#scrollOffsetX = maxX;
    }

    const isVertical = this.#direction === 1 || this.#direction === 3;
    const mainSize = isVertical ? contentHeight : contentWidth;
    let crossSize = isVertical ? contentWidth : contentHeight;

    for (const child of children) {
      const explicit = isVertical ? child.hasExplicitWidth : child.hasExplicitHeight;
      if (explicit) {
        continue;
      }

      const intrinsic = child.intrinsicSize();
      const childCross = isVertical ? (intrinsic?.width ?? child.rect.width) : (intrinsic?.height ?? child.rect.height);
      if (childCross > crossSize) {
        crossSize = childCross;
      }
    }

    for (const child of children) {
      if (child.hasPercentLayout) {
        child.resolveLayout(contentWidth, contentHeight);
      }
    }

    const results = computeFlexLayout({
      children,
      direction: this.#direction,
      align: this.#align,
      justifyContent: this.#justifyContent,
      gap: this.#gap,
      mainSize,
      crossSize,
      flexWrap: this.#flexWrap,
      alignContent: this.#alignContent,
    });

    for (const [i, child] of children.entries()) {
      const r = results[i]!;
      if (isVertical) {
        child.updateRect({
          x: contentX + r.crossPos - this.#scrollOffsetX,
          y: contentY + r.mainPos - this.#scrollOffsetY,
          width: r.crossExtent,
          height: r.mainExtent,
        });
      } else {
        child.updateRect({
          x: contentX + r.mainPos - this.#scrollOffsetX,
          y: contentY + r.crossPos - this.#scrollOffsetY,
          width: r.mainExtent,
          height: r.crossExtent,
        });
      }
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
    const scrollbarX = this.#rect.x + this.#rect.width - 1;
    renderScrollbar({
      buffer, x: scrollbarX, trackY: viewport.y, trackHeight: viewport.height, geometry, thumbColor: this.#extraColors.scrollbar, trackColor: this.#extraColors.scrollbarTrack,
    });
  }

  #renderHorizontalScrollbar(buffer: DrawListBuffer): void {
    const maxScroll = this.#maxScrollOffsetX();
    if (maxScroll === 0 && !this.#alwaysShowScrollbar) {
      return;
    }

    const viewport = this.#computeViewport();
    const contentWidth = this.#computeContentWidth();
    if (contentWidth <= 0) {
      return;
    }

    const geometry = computeScrollbarGeometry(viewport.width, contentWidth, this.#scrollOffsetX);
    const scrollbarY = this.#rect.y + this.#rect.height - 1;
    renderScrollbarHorizontal({
      buffer, y: scrollbarY, trackX: viewport.x, trackWidth: viewport.width, geometry, thumbColor: this.#extraColors.scrollbar, trackColor: this.#extraColors.scrollbarTrack,
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
    const scrollbarX = this.#rect.x + this.#rect.width - 1;
    return {
      x: scrollbarX,
      trackY: viewport.y,
      trackHeight: viewport.height,
      thumbY: viewport.y + geometry.thumbOffset,
      thumbSize: geometry.thumbSize,
    };
  }

  #horizontalScrollbarHitTest(): ScrollbarHitTestHorizontal | undefined {
    const maxScroll = this.#maxScrollOffsetX();
    if (maxScroll === 0 && !this.#alwaysShowScrollbar) {
      return undefined;
    }

    const viewport = this.#computeViewport();
    const contentWidth = this.#computeContentWidth();
    if (contentWidth <= 0) {
      return undefined;
    }

    const geometry = computeScrollbarGeometry(viewport.width, contentWidth, this.#scrollOffsetX);
    const scrollbarY = this.#rect.y + this.#rect.height - 1;
    return {
      y: scrollbarY,
      trackX: viewport.x,
      trackWidth: viewport.width,
      thumbX: viewport.x + geometry.thumbOffset,
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
  const ctorOptions = resolveThemedOverrides(options, SCROLLBOX_TOKEN_MAP);
  const widget = new ScrollBoxWidget({...getDefaultScrollBoxOptions(), ...ctorOptions});
  widget.initTokenMap(SCROLLBOX_TOKEN_MAP);
  bindThemeToWidget(widget, SCROLLBOX_TOKEN_MAP, options ?? {}, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default ScrollBoxWidget;
