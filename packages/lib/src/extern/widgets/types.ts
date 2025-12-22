export enum TuiWidgetAttributeType {
    /**
     * @see TuiWidgetId
     */
    Id = 0x01,
    /**
     * @see TuiWidgetRect
     */
    Rect = 0x02,
    /**
     * @see TuiWidgetStyle
     */
    Style = 0x04,
    /**
     * @see TuiWidgetBorder
     */
    Border = 0x08,
    /**
     * @see TuiWidgetShadow
     */
    Shadow = 0x10,
    /**
     * @see TuiWidgetText
     */
    Text = 0x20,
}

export interface TuiWidgetId {
    readonly id: U64;
}

export interface TuiWidgetRect {
    readonly rectX: U16;
    readonly rectY: U16;
    readonly rectWidth: U16;
    readonly rectHeight: U16;
}

export interface TuiWidgetStyle {
    readonly styleFgColor: U32;
    readonly styleBgColor: U32;
    readonly styleZIndex: I32;
    readonly styleVisible: U8;
    readonly styleBorderStyle: U8;
}

export interface TuiWidgetBorder {
    readonly borderTop: BOOL;
    readonly borderRight: BOOL;
    readonly borderBottom: BOOL;
    readonly borderLeft: BOOL;
}

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
 * @example
 * ┌────┬────┐
 * │    │    │█
 * ├────┼────┤█
 * │    │    │█
 * └────┴────┘█
 *  ███████████
 */
export interface TuiWidgetShadow {
    readonly shadowOffsetX: U16;
    readonly shadowOffsetY: U16;
    /**
     * @description
     * - true:  The shadow will be drawn over the others with character "█".
     * - false: The shadow will be drawn over the others, but no character will be covered.
     *   It means the affected cell looks "getting darkened".
     */
    readonly shadowCovered: BOOL;
    readonly shadowColor: U32;
}

export interface TuiWidgetText {
    readonly text: U64;
}
