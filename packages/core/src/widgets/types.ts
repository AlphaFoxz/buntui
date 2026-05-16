/**
 * @summary 32 bits = 4 bytes
 */
export const TuiWidgetComponentType = {
  /**
   * @see TuiWidgetRect
   */
  Rect: 0x00_01,
  /**
   * @see TuiWidgetColor
   */
  Color: 0x00_02,
  /**
   * @see TuiWidgetStyle
   */
  Style: 0x00_04,
  /**
   * @see TuiWidgetBorder
   */
  Border: 0x00_08,
  /**
   * @see TuiWidgetShadow
   */
  Shadow: 0x00_10,
  /**
   * @see TuiWidgetText
   */
  Text: 0x00_20,
} as const;
export type TuiWidgetComponentType = Enum<typeof TuiWidgetComponentType>;

/*
 * @summary 64 bits = 8 bytes
 */
export type TuiWidgetRect = {
  x: U16;
  y: U16;
  width: U16;
  height: U16;
};

/*
 * @summary 64 bits = 8 bytes
 */
export type TuiWidgetColor = {
  colorFg: U32;
  colorBg: U32;
};

/*
 * @summary 32 bits = 4 bytes
 */
export type TuiWidgetStyle = {
  styleZIndex: I16;
  styleModifier: U16;
};

export type FontStyleName = 'bold' | 'dim' | 'italic' | 'underline' | 'slowblink' | 'rapidblink' | 'reverse' | 'hidden' | 'crossedout' | 'fraktur' | 'overline';

export const FontStyleBit: Record<FontStyleName, U16> = {
  bold: Math.trunc(1),
  dim: 1 << 1,
  italic: 1 << 2,
  underline: 1 << 3,
  slowblink: 1 << 4,
  rapidblink: 1 << 5,
  reverse: 1 << 6,
  hidden: 1 << 7,
  crossedout: 1 << 8,
  fraktur: 1 << 9,
  overline: 1 << 10,
};

export type TuiFontStyleInput = FontStyleName | FontStyleName[] | U16;

export function resolveFontStyle(value: TuiFontStyleInput | undefined): U16 {
  if (value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    let result = 0;
    for (const name of value) {
      result |= FontStyleBit[name] ?? 0;
    }

    return result;
  }

  return FontStyleBit[value] ?? 0;
}

/*
 * @summary 96 bits = 12 bytes
 */
export type TuiWidgetBorder = {
  borderColor: U32;
  borderStyle: U8;
  borderTop: BOOL;
  borderRight: BOOL;
  borderBottom: BOOL;
  borderLeft: BOOL;
};

/**
 * @example
 *   Solid      Double
 * ┌───┬───┐  ╔═══╦═══╗  ╒═╤═╕  ╓─╥─╖
 * │   │   │  ║   ║   ║  ╞═╪═╡  ╟─╫─╢
 * ├───┼───┤  ╠═══╬═══╣  ╘═╧═╛  ╙─╨─╜
 * │   │   │  ║   ║   ║
 * └───┴───┘  ╚═══╩═══╝
 *  Rounded     Bold
 * ╭───┬───╮  ┏━━━┳━━━┓  ┎─┰─┒  ┍━┯━┑
 * │   │   │  ┃   ┃   ┃  ┠─╂─┨  ┝━┿━┥
 * ├───┼───┤  ┣━━━╋━━━┫  ┖─┸─┚  ┕━┷━┙
 * │   │   │  ┃   ┃   ┃
 * ╰───┴───╯  ┗━━━┻━━━┛
 *  Dashed     Dotted
 * ┌╴╴╴┬╴╴╴┐  ┌╌╌╌┬╌╌╌┐  ┌───┬─⊟⊞☒  ┌───┬─⊖⊕⊗
 * ┆   ┆   ┆  ┊   ┊   ┊  │   │   │  │   │   │
 * ┆╴╴╴┼╴╴╴┆  ┊╌╌╌┼╌╌╌┊  ├───┼───┤  ├───┼───┤
 * ┆   ┆   ┆  ┊   ┊   ┊  │   │   │  │   │   │
 * └╴╴╶┴╶╶╶┘  └╌╌╌┴╌╌╌┘  └───┴───¤  └───┴───⤡
 *  Outset-    Outset-
 *  Bold       Double
 * ┌───┬───┒  ┌───┬───╖  ┏━━━┯━━━┑  ╔═══╤═══╕
 * │   │   ┃  │   │   ║  ┃   │   │  ║   │   │
 * ├───┼───┨  ├───┼───╢  ┠───┼───┤  ╟───┼───┤
 * │   │   ┃  │   │   ║  ┃   │   │  ║   │   │
 * ┕━━━┷━━━┛  ╘═══╧═══╝  ┖───┴───┘  ╙───┴───┘
 */
export const TuiWidgetBorderStyle = {
  None: 0,
  Solid: 1,
  Double: 2,
  Rounded: 3,
  Bold: 4,
  Dashed: 5,
  Dotted: 6,
  OutsetBold: 7,
  OutsetDouble: 8,
} as const;
export type TuiWidgetBorderStyle = Enum<typeof TuiWidgetBorderStyle>;

export type TuiBorderStyleName = 'none' | 'solid' | 'double' | 'rounded' | 'bold' | 'dashed' | 'dotted' | 'outsetbold' | 'outsetdouble';

const BORDER_STYLE_MAP: Record<TuiBorderStyleName, U8> = {
  none: 0,
  solid: 1,
  double: 2,
  rounded: 3,
  bold: 4,
  dashed: 5,
  dotted: 6,
  outsetbold: 7,
  outsetdouble: 8,
};

export function resolveBorderStyle(value: TuiBorderStyleName | U8): U8 {
  if (typeof value === 'string') {
    return BORDER_STYLE_MAP[value] ?? 0;
  }

  return value;
}

/**
 * @summary 96 bits = 12 bytes
 * @example
 * ┌────┬────┐
 * │    │    │█
 * ├────┼────┤█
 * │    │    │█
 * └────┴────┘█
 *  ███████████
 */
export type TuiWidgetShadow = {
  shadowOffsetX: U16;
  shadowOffsetY: U16;
  shadowColor: U32;
  /**
     * @description
     * - true:  The shadow will be drawn over the others with character "█".
     * - false: The shadow will be drawn over the others, but no character will be covered.
     *   It means the affected cell looks "getting darkened".
     */
  shadowCovered: BOOL;
};

/**
 * @summary 64 bits = 8 bytes
 */
export type TuiWidgetText = {
  value: string;
};

/**
 * A 2D size used for intrinsic size reporting by widgets.
 */
export type TuiWidgetSize = {
  width: U16;
  height: U16;
};

/**
 * Four-sided padding for layout containers.
 */
export type TuiWidgetPadding = {
  paddingTop: U16;
  paddingRight: U16;
  paddingBottom: U16;
  paddingLeft: U16;
};

export const LayoutDirection = {
  Horizontal: 0,
  Vertical: 1,
} as const;
export type LayoutDirection = Enum<typeof LayoutDirection>;

export type LayoutDirectionName = 'horizontal' | 'vertical';

const LAYOUT_DIRECTION_MAP: Record<LayoutDirectionName, LayoutDirection> = {
  horizontal: 0,
  vertical: 1,
};

export function resolveLayoutDirection(value: LayoutDirectionName | LayoutDirection): LayoutDirection {
  if (typeof value === 'string') {
    return LAYOUT_DIRECTION_MAP[value] ?? 1;
  }

  return value;
}

export const LayoutAlignment = {
  Start: 0,
  Center: 1,
  End: 2,
  Stretch: 3,
} as const;
export type LayoutAlignment = Enum<typeof LayoutAlignment>;

export type LayoutAlignmentName = 'start' | 'center' | 'end' | 'stretch';

const LAYOUT_ALIGNMENT_MAP: Record<LayoutAlignmentName, LayoutAlignment> = {
  start: 0,
  center: 1,
  end: 2,
  stretch: 3,
};

export function resolveLayoutAlignment(value: LayoutAlignmentName | LayoutAlignment): LayoutAlignment {
  if (typeof value === 'string') {
    return LAYOUT_ALIGNMENT_MAP[value] ?? 3;
  }

  return value;
}

export type TuiPercent = `${number}%`;
export type TuiSizeValue = U16 | TuiPercent;
export type TuiWidgetPercentSpec = {
  x?: TuiPercent;
  y?: TuiPercent;
  width?: TuiPercent;
  height?: TuiPercent;
};
