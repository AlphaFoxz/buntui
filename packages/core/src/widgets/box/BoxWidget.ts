import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {BorderSides} from '../../draw_list/types';
import {parseColor, type TuiColor} from '../../utils/color';
import {extractPercentSpec, isPercent} from '../../utils/percent';
import {
  LayoutAlignment as LayoutAlignmentEnum,
  type LayoutAlignment,
  type LayoutDirection,
  type TuiSizeValue,
  type TuiWidgetBorder,
  type TuiWidgetColor,
  type TuiWidgetPadding,
  type TuiWidgetRect,
  type TuiWidgetShadow,
  type TuiWidgetSize,
  type TuiWidgetStyle,
} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';

export type BoxWidgetOptions = Omit<TuiWidgetColor & Partial<TuiWidgetBorder> & Partial<TuiWidgetShadow>, 'colorFg' | 'colorBg' | 'borderColor' | 'shadowColor'>
  & Partial<TuiWidgetStyle>
  & Partial<TuiWidgetPadding>
  & {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    colorFg?: TuiColor;
    colorBg?: TuiColor;
    borderColor?: TuiColor;
    shadowColor?: TuiColor;
    /** Layout direction for children. Defaults to Vertical (1). */
    direction?: LayoutDirection;
    gap?: U16;
    align?: LayoutAlignment;
    draggable?: boolean;
  };

export class BoxWidget extends TuiWidgetEntity {
  readonly #rect: TuiWidgetRect;
  readonly #color: TuiWidgetColor;
  readonly #style: TuiWidgetStyle;
  readonly #border: TuiWidgetBorder;
  readonly #shadow: TuiWidgetShadow;
  readonly #padding: TuiWidgetPadding;
  #direction: LayoutDirection;
  #gap: U16;
  #align: LayoutAlignment;
  #layoutDirty = false;
  readonly #ownChildren: TuiWidgetEntity[] = [];

  constructor(options: BoxWidgetOptions) {
    super();
    const spec = extractPercentSpec(options.x, options.y, options.width, options.height);
    if (spec) {
      this.setPercentSpec(spec);
    }

    this.#rect = {
      x: isPercent(options.x) ? 0 : (options.x ?? 0),
      y: isPercent(options.y) ? 0 : (options.y ?? 0),
      width: isPercent(options.width) ? 0 : (options.width ?? 32),
      height: isPercent(options.height) ? 0 : (options.height ?? 3),
    };
    this.#color = {
      colorFg: parseColor(options.colorFg ?? 0xFF_FF_FF_FF),
      colorBg: parseColor(options.colorBg ?? 0x00_00_00_FF),
    };
    this.#style = {
      styleZIndex: options.styleZIndex ?? 0,
      styleModifier: options.styleModifier ?? 0,
    };
    this.#border = {
      borderColor: parseColor(options.borderColor ?? 0xFF_FF_FF_FF),
      borderStyle: options.borderStyle ?? 0,
      borderTop: options.borderTop ?? false,
      borderRight: options.borderRight ?? false,
      borderBottom: options.borderBottom ?? false,
      borderLeft: options.borderLeft ?? false,
    };
    this.#shadow = {
      shadowOffsetX: options.shadowOffsetX ?? 0,
      shadowOffsetY: options.shadowOffsetY ?? 0,
      shadowColor: parseColor(options.shadowColor ?? 0),
      shadowCovered: options.shadowCovered ?? false,
    };
    this.#padding = {
      paddingTop: options.paddingTop ?? 0,
      paddingRight: options.paddingRight ?? 0,
      paddingBottom: options.paddingBottom ?? 0,
      paddingLeft: options.paddingLeft ?? 0,
    };
    this.#direction = options.direction ?? 1;
    this.#gap = options.gap ?? 0;
    this.#align = options.align ?? 3;
    this.#layoutDirty = true;

    if (options.draggable) {
      this.setDraggable(true);
    }
  }

  // -- Accessors --

  override get rect(): TuiWidgetRect {
    return this.#rect;
  }

  get color(): TuiWidgetColor {
    return this.#color;
  }

  get style(): TuiWidgetStyle {
    return this.#style;
  }

  get border(): TuiWidgetBorder {
    return this.#border;
  }

  get shadow(): TuiWidgetShadow {
    return this.#shadow;
  }

  get padding(): TuiWidgetPadding {
    return this.#padding;
  }

  override get zIndex(): number {
    return this.#style.styleZIndex;
  }

  // -- Update methods --

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    const oldX = this.#rect.x;
    const oldY = this.#rect.y;
    Object.assign(this.#rect, rect);
    this.#layoutDirty = true;

    this.propagatePositionDelta(this.#rect.x - oldX, this.#rect.y - oldY);
  }

  updateColor(color: Partial<TuiWidgetColor>): void {
    if (color.colorFg !== undefined) {
      this.#color.colorFg = parseColor(color.colorFg);
    }

    if (color.colorBg !== undefined) {
      this.#color.colorBg = parseColor(color.colorBg);
    }
  }

  updateStyle(style: Partial<TuiWidgetStyle>): void {
    Object.assign(this.#style, style);
  }

  updateBorder(border: Partial<TuiWidgetBorder>): void {
    if (border.borderColor !== undefined) {
      this.#border.borderColor = parseColor(border.borderColor);
    }

    if (border.borderStyle !== undefined) {
      this.#border.borderStyle = border.borderStyle;
    }

    if (border.borderTop !== undefined) {
      this.#border.borderTop = border.borderTop;
    }

    if (border.borderRight !== undefined) {
      this.#border.borderRight = border.borderRight;
    }

    if (border.borderBottom !== undefined) {
      this.#border.borderBottom = border.borderBottom;
    }

    if (border.borderLeft !== undefined) {
      this.#border.borderLeft = border.borderLeft;
    }
  }

  updateShadow(shadow: Partial<TuiWidgetShadow>): void {
    if (shadow.shadowColor !== undefined) {
      this.#shadow.shadowColor = parseColor(shadow.shadowColor);
    }

    if (shadow.shadowOffsetX !== undefined) {
      this.#shadow.shadowOffsetX = shadow.shadowOffsetX;
    }

    if (shadow.shadowOffsetY !== undefined) {
      this.#shadow.shadowOffsetY = shadow.shadowOffsetY;
    }

    if (shadow.shadowCovered !== undefined) {
      this.#shadow.shadowCovered = shadow.shadowCovered;
    }
  }

  updatePadding(padding: Partial<TuiWidgetPadding>): void {
    Object.assign(this.#padding, padding);
    this.#layoutDirty = true;
  }

  updateDirection(direction: LayoutDirection): void {
    this.#direction = direction;
    this.#layoutDirty = true;
  }

  updateGap(gap: U16): void {
    this.#gap = gap;
    this.#layoutDirty = true;
  }

  updateAlign(align: LayoutAlignment): void {
    this.#align = align;
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
    if (this.#ownChildren.length === 0) {
      return undefined;
    }

    let totalMain = 0;
    let maxCross = 0;
    for (const child of this.#ownChildren) {
      const intrinsic = child.intrinsicSize();
      if (!intrinsic) {
        return undefined;
      }

      const childMain = this.#direction === 1 ? intrinsic.height : intrinsic.width;
      const childCross = this.#direction === 1 ? intrinsic.width : intrinsic.height;
      totalMain += childMain;
      if (childCross > maxCross) {
        maxCross = childCross;
      }
    }

    const totalGaps = Math.max(0, this.#ownChildren.length - 1) * this.#gap;
    totalMain += totalGaps;

    const hBorder = (this.#border.borderLeft ? 1 : 0) + (this.#border.borderRight ? 1 : 0);
    const vBorder = (this.#border.borderTop ? 1 : 0) + (this.#border.borderBottom ? 1 : 0);

    if (this.#direction === 1) {
      return {
        width: maxCross + this.#padding.paddingLeft + this.#padding.paddingRight + hBorder,
        height: totalMain + this.#padding.paddingTop + this.#padding.paddingBottom + vBorder,
      };
    }

    return {
      width: totalMain + this.#padding.paddingLeft + this.#padding.paddingRight + hBorder,
      height: maxCross + this.#padding.paddingTop + this.#padding.paddingBottom + vBorder,
    };
  }

  // -- Hit testing --

  override containsPoint(x: number, y: number): boolean {
    const {x: rx, y: ry, width: rw, height: rh} = this.#rect;
    return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
  }

  // -- Rendering --

  override emitDrawCommands(buffer: DrawListBuffer): void {
    if (this.#layoutDirty) {
      this.#computeLayout();
    }

    const {x, y, width, height} = this.#rect;
    const {colorBg} = this.#color;
    const {borderColor, borderStyle, borderTop, borderRight, borderBottom, borderLeft} = this.#border;

    buffer.pushClip(x, y, width, height);

    // Background fill
    buffer.drawRect({
      x,
      y,
      width,
      height,
      bgRgba: colorBg,
    });

    // Border
    if (borderStyle !== 0) {
      const sides = (borderTop ? BorderSides.Top : 0)
        | (borderRight ? BorderSides.Right : 0)
        | (borderBottom ? BorderSides.Bottom : 0)
        | (borderLeft ? BorderSides.Left : 0);
      buffer.drawBorder({
        x,
        y,
        width,
        height,
        colorRgba: borderColor,
        style: borderStyle,
        sides,
      });
    }

    this.renderChildren(buffer);
    buffer.popClip();
  }

  // -- Layout engine --

  #resolveChildExtent(child: TuiWidgetEntity, isVertical: boolean): number {
    const intrinsic = child.intrinsicSize();
    if (isVertical) {
      return intrinsic?.height ?? child.rect.height;
    }

    return intrinsic?.width ?? child.rect.width;
  }

  #resolveCrossAxis(
    child: TuiWidgetEntity,
    crossSize: number,
    isVertical: boolean,
  ): {crossPos: number; crossExtent: number} {
    const intrinsic = child.intrinsicSize();
    let crossExtent: number;
    crossExtent = isVertical ? intrinsic?.width ?? child.rect.width : intrinsic?.height ?? child.rect.height;

    let crossPos: number;
    switch (this.#align) {
      case LayoutAlignmentEnum.Start: {
        crossPos = 0;
        break;
      }

      case LayoutAlignmentEnum.Center: {
        crossPos = Math.floor((crossSize - crossExtent) / 2);
        break;
      }

      case LayoutAlignmentEnum.End: {
        crossPos = crossSize - crossExtent;
        break;
      }

      case LayoutAlignmentEnum.Stretch: {
        crossPos = 0;
        crossExtent = crossSize;
        break;
      }
    }

    return {crossPos, crossExtent};
  }

  #computeLayout(): void {
    const direction = this.#direction;

    const children = this.#ownChildren;
    if (children.length === 0) {
      this.#layoutDirty = false;
      return;
    }

    const {x, y, width, height} = this.#rect;
    const {paddingTop, paddingLeft} = this.#padding;
    const borderH = (this.#border.borderLeft ? 1 : 0) + (this.#border.borderRight ? 1 : 0);
    const borderV = (this.#border.borderTop ? 1 : 0) + (this.#border.borderBottom ? 1 : 0);
    const hInset = paddingLeft + this.#padding.paddingRight + borderH;
    const vInset = paddingTop + this.#padding.paddingBottom + borderV;

    const contentX = x + paddingLeft + (this.#border.borderLeft ? 1 : 0);
    const contentY = y + paddingTop + (this.#border.borderTop ? 1 : 0);
    const contentWidth = width - hInset;
    const contentHeight = height - vInset;

    const isVertical = direction === 1;
    const crossSize = isVertical ? contentWidth : contentHeight;
    const isStretch = this.#align === LayoutAlignmentEnum.Stretch;

    // Position each child
    let mainPos = 0;
    for (const child of children) {
      if (child.hasPercentLayout) {
        child.resolveLayout(contentWidth, contentHeight);
      }

      const mainExtent = this.#resolveChildExtent(child, isVertical);
      const {crossPos, crossExtent} = this.#resolveCrossAxis(child, crossSize, isVertical);

      const childRect = isVertical
        ? {
          x: contentX + crossPos,
          y: contentY + mainPos,
          width: isStretch ? crossSize : crossExtent,
          height: mainExtent,
        }
        : {
          x: contentX + mainPos,
          y: contentY + crossPos,
          width: mainExtent,
          height: isStretch ? crossSize : crossExtent,
        };

      child.updateRect(childRect);
      mainPos += mainExtent + this.#gap;
    }

    this.#layoutDirty = false;
  }
}

export const DEFAULT_BOX_OPTIONS: BoxWidgetOptions = {
  x: 0 as U16,
  y: 0 as U16,
  width: 32 as U16,
  height: 3 as U16,
  borderStyle: 1 as U8,
  borderTop: true,
  borderRight: true,
  borderBottom: true,
  borderLeft: true,
  colorFg: 0xFF_FF_FF_FF,
  colorBg: 0x00_00_00_FF,
};

export function createBox(options: Partial<BoxWidgetOptions> = {}): BoxWidget {
  return new BoxWidget({...DEFAULT_BOX_OPTIONS, ...options});
}

export default BoxWidget;
