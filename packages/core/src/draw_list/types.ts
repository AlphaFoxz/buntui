// DrawList Command types — must match packages/native/src/draw_list/commands.zig

export const DrawCmd = {
  // Frame state (0x00-0x0F)
  SetBackground: 0x00_01,
  SetCursor: 0x00_02,
  PushClip: 0x00_03,
  PopClip: 0x00_04,
  SetEntityId: 0x00_05,

  // Drawing primitives (0x10-0x1F)
  DrawRect: 0x00_10,
  DrawText: 0x00_11,
  DrawBorder: 0x00_12,
  DrawShadow: 0x00_13,
  DrawFill: 0x00_14,
  DrawChar: 0x00_15,
  DrawLine: 0x00_16,

  // Terminal control (0x20-0x2F)
  SetTitle: 0x00_20,
  ShowCursor: 0x00_21,
  HideCursor: 0x00_22,
  SetCursorMode: 0x00_23,

  // Synchronized update (0x30-0x3F)
  BeginSync: 0x00_30,
  EndSync: 0x00_31,
} as const;
export type DrawCmd = Enum<typeof DrawCmd>;

export const BorderSides = {
  Top: 0b0001,
  Right: 0b0010,
  Bottom: 0b0100,
  Left: 0b1000,
  All: 0b1111,
} as const;
export type BorderSides = Enum<typeof BorderSides>;

export const BorderStyle = {
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
export type BorderStyle = Enum<typeof BorderStyle>;

export const CursorMode = {
  BlinkingBlock: 1,
  Block: 2,
  BlinkingUnderscore: 3,
  Underscore: 4,
  BlinkingIBeam: 5,
  IBeam: 6,
} as const;
export type CursorMode = Enum<typeof CursorMode>;

export const LineDirection = {
  Horizontal: 0,
  Vertical: 1,
} as const;
export type LineDirection = Enum<typeof LineDirection>;

export const LineStyle = {
  Thin: 0,
  Double: 1,
  Bold: 2,
  Dashed: 3,
  Dotted: 4,
} as const;
export type LineStyle = Enum<typeof LineStyle>;

export const BUFFER_HEADER_SIZE = 8;
export const CMD_HEADER_SIZE = 8;
export const BUFFER_MAGIC = 0x54_42;
export const BUFFER_VERSION = 1;
