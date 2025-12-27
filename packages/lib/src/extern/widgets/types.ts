export const TUI_WIDGET_COMPONENT_MEM_USAGE = Object.freeze({
  ComponentType: 4,
  Rect: 8,
  Color: 8,
  Style: 4,
  Border: 12,
  Shadow: 12,
  Text: 8,
});

/**
 * @summary 32 bits = 4 bytes
 */
export enum TuiWidgetComponentType {
  /**
     * @see TuiWidgetRect
     */
  Rect = 0x00_01,
  /**
     * @see TuiWidgetStyle
     */
  Style = 0x00_02,
  /**
     * @see TuiWidgetBorder
     */
  Border = 0x00_04,
  /**
     * @see TuiWidgetShadow
     */
  Shadow = 0x00_08,
  /**
     * @see TuiWidgetText
     */
  Text = 0x00_10,
}

/*
 * @summary 64 bits = 8 bytes
 */
export type TuiWidgetRect = {
  readonly rectX: U16;
  readonly rectY: U16;
  readonly rectWidth: U16;
  readonly rectHeight: U16;
};

/*
 * @summary 64 bits = 8 bytes
 */
export type TuiWidgetColor = {
  readonly colorFg: U32;
  readonly colorBg: U32;

};

/*
 * @summary 32 bits = 4 bytes
 */
export type TuiWidgetStyle = {
  readonly styleZIndex: I16;
  readonly styleModifier: U16;
};

/*
 * @summary 96 bits = 12 bytes
 */
export type TuiWidgetBorder = {
  readonly borderColor: U32;
  readonly borderStyle: U8;
  readonly borderTop: BOOL;
  readonly borderRight: BOOL;
  readonly borderBottom: BOOL;
  readonly borderLeft: BOOL;
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
export enum TuiWidgetBorderStyle {
  None = 0,
  Solid = 1,
  Double = 2,
  Rounded = 3,
  bold = 4,
  Dashed = 5,
  Dotted = 6,
  OutsetBold = 7,
  OutsetDouble = 8,
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
  readonly shadowOffsetX: U16;
  readonly shadowOffsetY: U16;
  readonly shadowColor: U32;
  /**
     * @description
     * - true:  The shadow will be drawn over the others with character "█".
     * - false: The shadow will be drawn over the others, but no character will be covered.
     *   It means the affected cell looks "getting darkened".
     */
  readonly shadowCovered: BOOL;
};

/**
 * @summary 64 bits = 8 bytes
 */
export type TuiWidgetText = {
  text: string;
  // Readonly textPtr: U64;
};
