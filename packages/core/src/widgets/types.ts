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

export const LayoutAlignment = {
  Start: 0,
  Center: 1,
  End: 2,
  Stretch: 3,
} as const;
export type LayoutAlignment = Enum<typeof LayoutAlignment>;
