/**
 * @summary 32 bits = 4 bytes
 */
export const TuiWidgetComponentFlag = {
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
export type TuiWidgetComponentFlag = Enum<typeof TuiWidgetComponentFlag>;

/*
 * @summary 64 bits = 8 bytes
 */
export type TuiWidgetRect = {
  x: I16;
  y: I16;
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

export type TuiFontStyleName = 'bold' | 'dim' | 'italic' | 'underline' | 'slowblink' | 'rapidblink' | 'reverse' | 'hidden' | 'crossedout' | 'fraktur' | 'overline';

export const TuiFontStyleBit: Record<TuiFontStyleName, U16> = {
  bold: 1,
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

export type TuiFontStyleInput = TuiFontStyleName | TuiFontStyleName[] | U16;

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
      result |= TuiFontStyleBit[name] ?? 0;
    }

    return result;
  }

  return TuiFontStyleBit[value] ?? 0;
}

/*
 * @summary 96 bits = 12 bytes
 */
export type TuiWidgetBorder = {
  colorBorder: U32;
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
export type {BorderStyle} from '../draw_list/types';

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

export function resolveBorderStyle(value: unknown): U8 {
  if (typeof value === 'string') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return BORDER_STYLE_MAP[value as TuiBorderStyleName] ?? 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  return 0;
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
  colorShadow: U32;
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

export const TuiLayoutDirection = {
  Horizontal: 0,
  Vertical: 1,
} as const;
export type TuiLayoutDirection = Enum<typeof TuiLayoutDirection>;

export type TuiLayoutDirectionName = 'horizontal' | 'vertical';

const LAYOUT_DIRECTION_MAP: Record<TuiLayoutDirectionName, TuiLayoutDirection> = {
  horizontal: 0,
  vertical: 1,
};

export function resolveLayoutDirection(value: TuiLayoutDirectionName | TuiLayoutDirection): TuiLayoutDirection {
  if (typeof value === 'string') {
    return LAYOUT_DIRECTION_MAP[value] ?? 1;
  }

  return value;
}

export const TuiLayoutAlignment = {
  Start: 0,
  Center: 1,
  End: 2,
  Stretch: 3,
} as const;
export type TuiLayoutAlignment = Enum<typeof TuiLayoutAlignment>;

export type TuiLayoutAlignmentName = 'start' | 'center' | 'end' | 'stretch';

const LAYOUT_ALIGNMENT_MAP: Record<TuiLayoutAlignmentName, TuiLayoutAlignment> = {
  start: 0,
  center: 1,
  end: 2,
  stretch: 3,
};

export function resolveLayoutAlignment(value: TuiLayoutAlignmentName | TuiLayoutAlignment): TuiLayoutAlignment {
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
