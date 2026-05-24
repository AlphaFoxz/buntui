import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {BorderSides} from '../../draw_list/types';
import {parseColor, type TuiColor} from '../../utils/color';
import {getTheme} from '../../theme/provider';
import {resolveWidgetColors} from '../../theme/resolve';
import {
  TuiLayoutAlignment as LayoutAlignmentEnum,
  resolveBorderStyle,
  resolveLayoutDirection,
  resolveLayoutAlignment,
  resolveFontStyle,
  type TuiLayoutAlignment,
  type TuiLayoutAlignmentName,
  type TuiBorderStyleName,
  type TuiLayoutDirection,
  type TuiLayoutDirectionName,
  type TuiSizeValue,
  type TuiWidgetBorder,
  type TuiWidgetColor,
  type TuiWidgetPadding,
  type TuiWidgetRect,
  type TuiWidgetShadow,
  type TuiWidgetSize,
  type TuiWidgetStyle,
  type TuiFontStyleInput,
} from '../types';
import {TuiWidgetEntity} from '../TuiWidgetEntity';

export type BorderShorthand = boolean | string | number;

export type BoxWidgetOptions = Omit<TuiWidgetColor & Partial<TuiWidgetBorder> & Partial<TuiWidgetShadow>, 'colorFg' | 'colorBg' | 'borderColor' | 'shadowColor' | 'borderStyle'>
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
    border?: BorderShorthand;
    borderStyle?: TuiBorderStyleName;
    direction?: TuiLayoutDirectionName;
    gap?: U16;
    align?: TuiLayoutAlignmentName;
    draggable?: boolean;
    styleModifier?: TuiFontStyleInput;
    styleZIndex?: I16;
  };

/**
 * Expand a border shorthand value into individual side booleans.
 * Accepts: boolean, number, or CSS-like string ("true", "1", "1 0", "1 0 1 0", etc.)
 */
type Border = {borderTop: boolean; borderRight: boolean; borderBottom: boolean; borderLeft: boolean};

function expandBorderShorthand(value: BorderShorthand): Border {
  if (typeof value === 'boolean') {
    return {
      borderTop: value,
      borderRight: value,
      borderBottom: value,
      borderLeft: value,
    };
  }

  if (typeof value === 'number') {
    const v = value !== 0;
    return {
      borderTop: v,
      borderRight: v,
      borderBottom: v,
      borderLeft: v,
    };
  }

  if (value === 'true' || value === '1') {
    return {
      borderTop: true,
      borderRight: true,
      borderBottom: true,
      borderLeft: true,
    };
  }

  if (value === 'false' || value === '0' || value === '') {
    return {
      borderTop: false,
      borderRight: false,
      borderBottom: false,
      borderLeft: false,
    };
  }

  const parts = value.split(/\s+/v);
  let top: boolean;
  let right: boolean;
  let bottom: boolean;
  let left: boolean;

  switch (parts.length) {
    case 1: {
      const isVertical = parts[0] !== '0';
      top = isVertical;
      right = isVertical;
      bottom = isVertical;
      left = isVertical;
      break;
    }

    case 2: {
      const isVertical = parts[0]! !== '0';
      const isHorizontal = parts[1]! !== '0';
      top = isVertical;
      bottom = isVertical;
      right = isHorizontal;
      left = isHorizontal;
      break;
    }

    case 3: {
      top = parts[0]! !== '0';
      right = parts[1]! !== '0';
      bottom = parts[2]! !== '0';
      left = right;
      break;
    }

    default: {
      top = parts[0]! !== '0';
      right = parts[1]! !== '0';
      bottom = parts[2]! !== '0';
      left = parts[3]! !== '0';
      break;
    }
  }

  return {
    borderTop: top,
    borderRight: right,
    borderBottom: bottom,
    borderLeft: left,
  };
}

function initBorder(options: BoxWidgetOptions): TuiWidgetBorder {
  const theme = getTheme();
  const expansion = options.border === undefined
    ? undefined
    : expandBorderShorthand(options.border);
  return {
    borderColor: parseColor(options.borderColor ?? theme.colors.border),
    borderStyle: resolveBorderStyle(options.borderStyle ?? 'none'),
    borderTop: options.borderTop ?? expansion?.borderTop ?? false,
    borderRight: options.borderRight ?? expansion?.borderRight ?? false,
    borderBottom: options.borderBottom ?? expansion?.borderBottom ?? false,
    borderLeft: options.borderLeft ?? expansion?.borderLeft ?? false,
  };
}

export class BoxWidget extends TuiWidgetEntity {
  readonly #rect: TuiWidgetRect;
  readonly #color: TuiWidgetColor;
  readonly #style: TuiWidgetStyle;
  readonly #border: TuiWidgetBorder;
  readonly #shadow: TuiWidgetShadow;
  readonly #padding: TuiWidgetPadding;
  #direction: TuiLayoutDirection;
  #gap: U16;
  #align: TuiLayoutAlignment;
  #layoutDirty = false;
  readonly #layoutChildren: TuiWidgetEntity[] = [];

  constructor(options: BoxWidgetOptions) {
    super();
    this.#rect = this.initRect(options.x, options.y, options.width, options.height, {width: 32, height: 3});
    const theme = getTheme();
    this.#color = {
      colorFg: parseColor(options.colorFg ?? theme.colors.text),
      colorBg: parseColor(options.colorBg ?? theme.colors.background),
    };
    this.#style = {
      styleZIndex: options.styleZIndex ?? 0,
      styleModifier: resolveFontStyle(options.styleModifier),
    };
    this.#border = initBorder(options);
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
    this.#direction = resolveLayoutDirection(options.direction ?? 'vertical');
    this.#gap = options.gap ?? 0;
    this.#align = resolveLayoutAlignment(options.align ?? 'stretch');
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

  updateStyle(style: Omit<Partial<TuiWidgetStyle>, 'styleModifier'> & {styleModifier?: TuiFontStyleInput}): void {
    if (style.styleModifier !== undefined) {
      this.#style.styleModifier = resolveFontStyle(style.styleModifier);
    }

    if (style.styleZIndex !== undefined) {
      this.#style.styleZIndex = style.styleZIndex;
    }
  }

  updateBorder(border: Omit<Partial<TuiWidgetBorder>, 'borderStyle'> & {border?: BorderShorthand; borderStyle?: TuiBorderStyleName}): void {
    if (border.borderColor !== undefined) {
      this.#border.borderColor = parseColor(border.borderColor);
    }

    if (border.borderStyle !== undefined) {
      this.#border.borderStyle = resolveBorderStyle(border.borderStyle);
    }

    if (border.border !== undefined) {
      const {borderTop, borderRight, borderBottom, borderLeft} = expandBorderShorthand(border.border);
      this.#border.borderTop = borderTop;
      this.#border.borderRight = borderRight;
      this.#border.borderBottom = borderBottom;
      this.#border.borderLeft = borderLeft;
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

  setDirection(direction: TuiLayoutDirectionName): void {
    this.#direction = resolveLayoutDirection(direction);
    this.#layoutDirty = true;
  }

  setGap(gap: U16): void {
    this.#gap = gap;
    this.#layoutDirty = true;
  }

  setAlign(align: TuiLayoutAlignmentName): void {
    this.#align = resolveLayoutAlignment(align);
    this.#layoutDirty = true;
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
    if (this.#layoutChildren.length === 0) {
      return undefined;
    }

    let totalMain = 0;
    let maxCross = 0;
    for (const child of this.#layoutChildren) {
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

    const totalGaps = Math.max(0, this.#layoutChildren.length - 1) * this.#gap;
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

  // -- Rendering --

  override emitDrawCommands(buffer: DrawListBuffer): void {
    if (this.#layoutDirty) {
      this.#computeLayout();
    }

    const {x, y, width, height} = this.#rect;
    const {colorBg} = this.#color;
    const {borderColor, borderStyle, borderTop, borderRight, borderBottom, borderLeft} = this.#border;

    buffer.pushClip(x, y, width, height);

    buffer.drawRect({
      x,
      y,
      width,
      height,
      bgRgba: colorBg,
    });

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

    const borderH = (borderLeft ? 1 : 0) + (borderRight ? 1 : 0);
    const borderV = (borderTop ? 1 : 0) + (borderBottom ? 1 : 0);
    const {paddingTop, paddingLeft} = this.#padding;
    const contentX = x + paddingLeft + (borderLeft ? 1 : 0);
    const contentY = y + paddingTop + (borderTop ? 1 : 0);
    const contentWidth = width - paddingLeft - this.#padding.paddingRight - borderH;
    const contentHeight = height - paddingTop - this.#padding.paddingBottom - borderV;

    buffer.pushClip(contentX, contentY, contentWidth, contentHeight);
    this.renderChildren(buffer);
    buffer.popClip();

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

    const children = this.#layoutChildren;
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

export function getDefaultBoxOptions(): BoxWidgetOptions {
  return {
    x: 0,
    y: 0,
    width: 32,
    height: 3,
    border: true,
    borderStyle: 'solid',
    ...resolveWidgetColors({
      colorFg: 'text',
      colorBg: 'background',
      borderColor: 'border',
    }),
  };
}

export function createBox(options: Partial<BoxWidgetOptions> = {}): BoxWidget {
  return new BoxWidget({...getDefaultBoxOptions(), ...options});
}

export default BoxWidget;
