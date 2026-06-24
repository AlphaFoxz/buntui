import type {DrawListBuffer} from '../../draw-list/DrawListBuffer';
import {BorderSides} from '../../draw-list/types';
import {parseColor, type TuiColor} from '../../utils/color';
import {getTheme} from '../../theme/store';
import {resolveWidgetColors, bindThemeToWidget} from '../../theme/binding';
import {resolveThemedOverrides} from '../../theme/color-ref';
import {TuiWidgetEntity} from '../TuiWidgetEntity';
import {
  resolveBorderStyle,
  resolveLayoutDirection,
  resolveLayoutAlignment,
  resolveJustifyContent,
  resolveFlexWrap,
  resolveAlignContent,
  resolveFontStyle,
  type TuiLayoutAlignment,
  type TuiLayoutAlignmentName,
  type TuiBorderStyleName,
  type TuiLayoutDirection,
  type TuiLayoutDirectionName,
  type TuiJustifyContent,
  type TuiJustifyContentName,
  type TuiFlexWrap,
  type TuiFlexWrapName,
  type TuiAlignContent,
  type TuiAlignContentName,
  type TuiPositionName,
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
import {computeFlexLayout} from '../layout-flex';

export type BorderShorthand = boolean | string | number;

/**
 Options for {@link BoxWidget}, a flex row/column layout container.

 The layout engine is always flexbox-style. With all defaults
 (`direction: 'vertical'`, `align: 'stretch'`, `justifyContent: 'start'`,
 `gap: 0`, children `flexGrow: 0`) children simply stack sequentially — this
 is the "stack" baseline. Set `justifyContent` or give children `flexGrow` to
 opt into main-axis free-space distribution. There is no separate "stack"
 mode; stacking is the default behavior of the single flex engine.
 */
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
    flexWrap?: TuiFlexWrapName;
    alignContent?: TuiAlignContentName;
    draggable?: boolean;
    position?: TuiPositionName;
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

/**
 Flex row/column layout container (always-on flexbox engine).

 Two-pass layout (measure → arrange). Default props reproduce plain sequential
 stacking; `justifyContent` / per-child `flexGrow` enable free-space
 distribution. There is no separate "stack" mode — stacking is the default.
 */
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
  #flexWrap: TuiFlexWrap;
  #alignContent: TuiAlignContent;
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
    this.#flexWrap = resolveFlexWrap(options.flexWrap ?? 'nowrap');
    this.#alignContent = resolveAlignContent(options.alignContent ?? 'start');

    if (options.draggable ?? false) {
      this.setDraggable(true);
    }

    if (options.position) {
      this.setPosition(options.position);
    }
  }

  // -- Accessors --

  override get rect(): TuiWidgetRect {
    return this.#rect;
  }

  // A Box honors a bare-numeric height as definite so it keeps its fixed main
  // size (e.g. inside a ScrollBox) instead of collapsing to content-intrinsic.
  // This gives cross-axis alignment (alignSelf) room to work. Content widgets
  // (Text etc.) keep the base soft behavior to preserve stretch/fill.
  override get hasExplicitHeight(): boolean {
    return super.hasExplicitHeight || this.hasNumericHeight;
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

  setFlexWrap(value: TuiFlexWrapName): void {
    this.#flexWrap = resolveFlexWrap(value);
    this.#layoutDirty = true;
  }

  setAlignContent(value: TuiAlignContentName): void {
    this.#alignContent = resolveAlignContent(value);
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

  override contentOffsetForChild(child: TuiWidgetEntity): {dx: number; dy: number} {
    if (child.position !== 'absolute') {
      return {dx: 0, dy: 0};
    }

    const {x, y} = this.#rect;
    const {paddingTop, paddingLeft} = this.#padding;
    const {borderStyle, borderLeft, borderTop} = this.#border;
    return {
      dx: x + paddingLeft + (borderStyle !== 0 && borderLeft ? 1 : 0),
      dy: y + paddingTop + (borderStyle !== 0 && borderTop ? 1 : 0),
    };
  }

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
    const renderOrder = this.children.toSorted((a, b) => a.zIndex - b.zIndex);
    for (const child of renderOrder) {
      if (!child.visible || child.portal) {
        continue;
      }

      if (child.position === 'absolute') {
        buffer.pushOffset(contentX, contentY);
        child.emitDrawCommands(buffer);
        buffer.popOffset();
      } else {
        child.emitDrawCommands(buffer);
      }
    }

    buffer.popClip();

    buffer.popClip();
  }

  // -- Layout engine --

  #computeLayout(): void {
    const children = this.#layoutChildren.filter(c => c.position === 'static');
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

    const isVertical = this.#direction === 1 || this.#direction === 3;
    const mainSize = isVertical ? contentHeight : contentWidth;
    const crossSize = isVertical ? contentWidth : contentHeight;

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
      child.updateRect(isVertical
        ? {
          x: contentX + r.crossPos, y: contentY + r.mainPos, width: r.crossExtent, height: r.mainExtent,
        }
        : {
          x: contentX + r.mainPos, y: contentY + r.crossPos, width: r.mainExtent, height: r.crossExtent,
        });
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

/**
 Create a {@link BoxWidget} flex row/column container.
 */
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
