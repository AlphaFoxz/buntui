import type {DrawListBuffer} from '../../draw-list/DrawListBuffer';
import {BorderSides} from '../../draw-list/types';
import {parseColor, type TuiColor} from '../../utils/color';
import {getTheme} from '../../theme/store';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/binding';
import {resolveThemedOverrides} from '../../theme/color-ref';
import {
  TuiLayoutAlignment as LayoutAlignmentEnum,
  TuiJustifyContent as JustifyContentEnum,
  resolveBorderStyle,
  resolveLayoutDirection,
  resolveLayoutAlignment,
  resolveJustifyContent,
  resolveFontStyle,
  type TuiLayoutAlignment,
  type TuiLayoutAlignmentName,
  type TuiBorderStyleName,
  type TuiLayoutDirection,
  type TuiLayoutDirectionName,
  type TuiJustifyContent,
  type TuiJustifyContentName,
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

export type BoxWidgetOptions = Omit<TuiWidgetColor & Partial<TuiWidgetBorder> & Partial<TuiWidgetShadow>, 'colorFg' | 'colorBg' | 'colorBorder' | 'colorShadow' | 'borderStyle'>
  & Partial<TuiWidgetPadding>
  & {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    colorFg?: TuiColor;
    colorBg?: TuiColor;
    colorBorder?: TuiColor;
    colorShadow?: TuiColor;
    border?: BorderShorthand;
    borderStyle?: TuiBorderStyleName;
    direction?: TuiLayoutDirectionName;
    gap?: U16;
    align?: TuiLayoutAlignmentName;
    justifyContent?: TuiJustifyContentName;
    draggable?: boolean;
    styleModifier?: TuiFontStyleInput;
    styleZIndex?: I16;
  };

/**
 Expand a border shorthand value into individual side booleans.
 Accepts: boolean, number, or CSS-like string ("true", "1", "1 0", "1 0 1 0", etc.)
 */
type Border = {borderTop: boolean; borderRight: boolean; borderBottom: boolean; borderLeft: boolean};

function fillBorder(v: boolean): Border {
  return {
    borderTop: v, borderRight: v, borderBottom: v, borderLeft: v,
  };
}

function expandBorderShorthand(value: BorderShorthand): Border {
  if (typeof value === 'boolean') {
    return fillBorder(value);
  }

  if (typeof value === 'number') {
    return fillBorder(value !== 0);
  }

  if (value === '' || value === 'false') {
    return fillBorder(false);
  }

  const parts = value.split(/\s+/v);
  const first = parts[0]!;
  return {
    borderTop: first !== '0',
    borderRight: (parts[1] ?? first) !== '0',
    borderBottom: (parts[2] ?? first) !== '0',
    borderLeft: (parts[3] ?? parts[1] ?? first) !== '0',
  };
}

function initBorder(options: BoxWidgetOptions): TuiWidgetBorder {
  const theme = getTheme();
  const expansion = options.border === undefined
    ? undefined
    : expandBorderShorthand(options.border);
  return {
    colorBorder: parseColor(options.colorBorder ?? theme.colors.border),
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
  #justifyContent: TuiJustifyContent;
  #layoutDirty = true;
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
      colorShadow: parseColor(options.colorShadow ?? 0),
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
    this.#justifyContent = resolveJustifyContent(options.justifyContent ?? 'start');

    if (options.draggable ?? false) {
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
    return this.getZIndexOverride() ?? this.#style.styleZIndex;
  }

  // -- Update methods --

  override updateRect(rect: Partial<TuiWidgetRect>): void {
    const oldX = this.#rect.x;
    const oldY = this.#rect.y;
    const sizeChanged = rect.width !== undefined || rect.height !== undefined;
    Object.assign(this.#rect, rect);
    if (rect.x !== undefined || rect.y !== undefined) {
      this.propagatePositionDelta(this.#rect.x - oldX, this.#rect.y - oldY);
    }

    if (sizeChanged) {
      this.#layoutDirty = true;
    }
  }

  updateColor(color: Partial<TuiWidgetColor>): void {
    if (color.colorFg !== undefined) {
      this.#color.colorFg = this._resolveColorValue(color.colorFg, 'colorFg');
    }

    if (color.colorBg !== undefined) {
      this.#color.colorBg = this._resolveColorValue(color.colorBg, 'colorBg');
    }
  }

  updateThemeColors(resolved: Record<string, unknown>): void {
    this.updateColor({
      colorFg: resolved.colorFg === undefined ? undefined : this._resolveColorValue(resolved.colorFg, 'colorFg'),
      colorBg: resolved.colorBg === undefined ? undefined : this._resolveColorValue(resolved.colorBg, 'colorBg'),
    });
    if (resolved.colorBorder !== undefined) {
      this.updateBorder({colorBorder: this._resolveColorValue(resolved.colorBorder, 'colorBorder')});
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
    let dirty = false;
    if (border.colorBorder !== undefined) {
      this.#border.colorBorder = this._resolveColorValue(border.colorBorder, 'colorBorder');
    }

    if (border.borderStyle !== undefined) {
      this.#border.borderStyle = resolveBorderStyle(border.borderStyle);
      dirty = true;
    }

    if (border.border !== undefined) {
      const {borderTop, borderRight, borderBottom, borderLeft} = expandBorderShorthand(border.border);
      this.#border.borderTop = borderTop;
      this.#border.borderRight = borderRight;
      this.#border.borderBottom = borderBottom;
      this.#border.borderLeft = borderLeft;
      dirty = true;
    }

    if (border.borderTop !== undefined) {
      this.#border.borderTop = border.borderTop;
      dirty = true;
    }

    if (border.borderRight !== undefined) {
      this.#border.borderRight = border.borderRight;
      dirty = true;
    }

    if (border.borderBottom !== undefined) {
      this.#border.borderBottom = border.borderBottom;
      dirty = true;
    }

    if (border.borderLeft !== undefined) {
      this.#border.borderLeft = border.borderLeft;
      dirty = true;
    }

    if (dirty) {
      this.#layoutDirty = true;
    }
  }

  updateShadow(shadow: Partial<TuiWidgetShadow>): void {
    if (shadow.colorShadow !== undefined) {
      this.#shadow.colorShadow = this._resolveColorValue(shadow.colorShadow, 'colorShadow');
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

  setJustifyContent(justify: TuiJustifyContentName): void {
    this.#justifyContent = resolveJustifyContent(justify);
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

    const isVertical = this.#direction === 1 || this.#direction === 3;
    let totalMain = 0;
    let maxCross = 0;
    for (const child of this.#layoutChildren) {
      const intrinsic = child.intrinsicSize();
      if (!intrinsic) {
        return undefined;
      }

      const childMain = isVertical ? intrinsic.height : intrinsic.width;
      const childCross = isVertical ? intrinsic.width : intrinsic.height;
      totalMain += childMain;
      if (childCross > maxCross) {
        maxCross = childCross;
      }
    }

    const totalGaps = Math.max(0, this.#layoutChildren.length - 1) * this.#gap;
    totalMain += totalGaps;

    const hBorder = this.#border.borderStyle === 0 ? 0 : (this.#border.borderLeft ? 1 : 0) + (this.#border.borderRight ? 1 : 0);
    const vBorder = this.#border.borderStyle === 0 ? 0 : (this.#border.borderTop ? 1 : 0) + (this.#border.borderBottom ? 1 : 0);

    if (isVertical) {
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
      this.#layoutDirty = false;
    }

    const {x, y, width, height} = this.#rect;
    const {colorBg} = this.#color;
    const {colorBorder, borderStyle, borderTop, borderRight, borderBottom, borderLeft} = this.#border;

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
        colorRgba: colorBorder,
        style: borderStyle,
        sides,
      });
    }

    const borderH = borderStyle === 0 ? 0 : (borderLeft ? 1 : 0) + (borderRight ? 1 : 0);
    const borderV = borderStyle === 0 ? 0 : (borderTop ? 1 : 0) + (borderBottom ? 1 : 0);
    const {paddingTop, paddingLeft} = this.#padding;
    const contentX = x + paddingLeft + (borderStyle !== 0 && borderLeft ? 1 : 0);
    const contentY = y + paddingTop + (borderStyle !== 0 && borderTop ? 1 : 0);
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

      default: {
        assertNever(this.#align);
      }
    }

    return {crossPos, crossExtent};
  }

  /**
   Compute main-axis start offset and extra inter-child gap based on justifyContent
   and the remaining free space after flexGrow distribution.
   */
  #computeJustifyDistribution(freeSpace: number, count: number): {startOffset: number; extraGap: number} {
    if (freeSpace <= 0 || count === 0) {
      return {startOffset: 0, extraGap: 0};
    }

    switch (this.#justifyContent) {
      case JustifyContentEnum.Start: {
        return {startOffset: 0, extraGap: 0};
      }

      case JustifyContentEnum.Center: {
        return {startOffset: Math.floor(freeSpace / 2), extraGap: 0};
      }

      case JustifyContentEnum.End: {
        return {startOffset: freeSpace, extraGap: 0};
      }

      case JustifyContentEnum.SpaceBetween: {
        return count > 1
          ? {startOffset: 0, extraGap: Math.floor(freeSpace / (count - 1))}
          : {startOffset: 0, extraGap: 0};
      }

      case JustifyContentEnum.SpaceAround: {
        const perChild = Math.floor(freeSpace / count);
        return {startOffset: Math.floor(perChild / 2), extraGap: perChild};
      }

      case JustifyContentEnum.SpaceEvenly: {
        const gap = Math.floor(freeSpace / (count + 1));
        return {startOffset: gap, extraGap: gap};
      }

      default: {
        assertNever(this.#justifyContent);
      }
    }
  }

  /**
   Distribute positive free space across children proportional to their flexGrow values.
   Mutates `finalSizes` in place. Returns the absorbed share (so callers can recompute
   remaining free space for justifyContent).
   */
  #distributeFlexGrow(
    children: TuiWidgetEntity[],
    baseSizes: number[],
    finalSizes: number[],
    freeSpace: number,
  ): number {
    let totalGrow = 0;
    for (const child of children) {
      totalGrow += child.flexGrow;
    }

    if (totalGrow <= 0) {
      return 0;
    }

    let absorbed = 0;
    for (const [i, child] of children.entries()) {
      const grow = child.flexGrow;
      if (grow > 0) {
        const share = Math.floor((grow / totalGrow) * freeSpace);
        finalSizes[i] = baseSizes[i]! + share;
        absorbed += share;
      }
    }

    // Award any integer-division remainder to the last growing child
    const remainder = freeSpace - absorbed;
    if (remainder > 0) {
      for (let i = children.length - 1; i >= 0; i--) {
        if (children[i]!.flexGrow > 0) {
          finalSizes[i]! += remainder;
          break;
        }
      }

      absorbed += remainder;
    }

    return absorbed;
  }

  #computeLayout(): void {
    const children = this.#layoutChildren;
    if (children.length === 0) {
      return;
    }

    const {x, y, width, height} = this.#rect;
    const {paddingTop, paddingLeft} = this.#padding;
    const borderH = this.#border.borderStyle === 0 ? 0 : (this.#border.borderLeft ? 1 : 0) + (this.#border.borderRight ? 1 : 0);
    const borderV = this.#border.borderStyle === 0 ? 0 : (this.#border.borderTop ? 1 : 0) + (this.#border.borderBottom ? 1 : 0);
    const hInset = paddingLeft + this.#padding.paddingRight + borderH;
    const vInset = paddingTop + this.#padding.paddingBottom + borderV;

    const contentX = x + paddingLeft + (this.#border.borderStyle !== 0 && this.#border.borderLeft ? 1 : 0);
    const contentY = y + paddingTop + (this.#border.borderStyle !== 0 && this.#border.borderTop ? 1 : 0);
    const contentWidth = width - hInset;
    const contentHeight = height - vInset;

    const direction = this.#direction;
    const isVertical = direction === 1 || direction === 3;
    const isReverse = direction === 2 || direction === 3;
    const mainSize = isVertical ? contentHeight : contentWidth;
    const crossSize = isVertical ? contentWidth : contentHeight;
    const isStretch = this.#align === LayoutAlignmentEnum.Stretch;

    // Resolve percent specs first (may update child.rect sizes)
    for (const child of children) {
      if (child.hasPercentLayout) {
        child.resolveLayout(contentWidth, contentHeight);
      }
    }

    // Measure pass: compute base main size for each child
    const baseSizes = children.map(child => this.#resolveChildExtent(child, isVertical));

    // Compute total base + gaps and free space
    const totalGap = (children.length - 1) * this.#gap;
    const totalBase = baseSizes.reduce((sum, s) => sum + s, 0);
    let freeSpace = mainSize - totalBase - totalGap;

    // Grow pass: distribute positive free space via flexGrow
    const finalSizes = [...baseSizes];
    if (freeSpace > 0) {
      const absorbed = this.#distributeFlexGrow(children, baseSizes, finalSizes, freeSpace);
      if (absorbed > 0) {
        // Free space has been absorbed by flexGrow; none left for justify
        freeSpace = 0;
      }
    }

    // Justify pass: compute start offset and extra inter-child gap from remaining free space
    const {startOffset, extraGap} = this.#computeJustifyDistribution(freeSpace, children.length);

    // Arrange pass: compute each child's main position as if non-reverse,
    // then mirror along the main axis if direction is reversed (CSS flexbox *-reverse semantics).
    const positions: number[] = [];
    let mainPos = startOffset;
    for (let i = 0; i < children.length; i++) {
      positions[i] = mainPos;
      mainPos += finalSizes[i]! + this.#gap + extraGap;
    }

    if (isReverse) {
      for (let i = 0; i < children.length; i++) {
        positions[i] = mainSize - positions[i]! - finalSizes[i]!;
      }
    }

    for (const [i, child_] of children.entries()) {
      const child = child_;
      const mainExtent = finalSizes[i]!;
      const childMainPos = positions[i]!;
      const {crossPos, crossExtent} = this.#resolveCrossAxis(child, crossSize, isVertical);

      const childRect = isVertical
        ? {
          x: contentX + crossPos,
          y: contentY + childMainPos,
          width: isStretch ? crossSize : crossExtent,
          height: mainExtent,
        }
        : {
          x: contentX + childMainPos,
          y: contentY + crossPos,
          width: mainExtent,
          height: isStretch ? crossSize : crossExtent,
        };

      child.updateRect(childRect);
    }
  }
}

const BOX_TOKEN_MAP = {
  colorFg: 'text',
  colorBg: 'background',
  colorBorder: 'border',
} as const;

export function getDefaultBoxOptions(): BoxWidgetOptions {
  return {
    x: 0,
    y: 0,
    width: 32,
    height: 3,
    border: true,
    borderStyle: 'solid',
    ...resolveWidgetColors(BOX_TOKEN_MAP),
  };
}

export function createBox(options: Partial<BoxWidgetOptions> = {}): BoxWidget {
  const ctorOptions = resolveThemedOverrides(options, BOX_TOKEN_MAP);
  const widget = new BoxWidget({...getDefaultBoxOptions(), ...ctorOptions});
  widget.initTokenMap(BOX_TOKEN_MAP);
  bindThemeToWidget(widget, BOX_TOKEN_MAP, options, resolved => {
    widget.updateThemeColors(resolved);
  });
  return widget;
}

export default BoxWidget;
