import TuiDataViewWrapper from '../extern/TuiDataViewWrapper';

// Modifier bitmask — must match Zig core/event_payloads.zig
const MOD_SHIFT = 0x01;
const MOD_CTRL = 0x02;
const MOD_ALT = 0x04;
const MOD_META = 0x08;
const MOD_REPEAT = 0x10;

// Mouse presence flags — must match Zig core/event_payloads.zig
const HAS_BUTTON = 0x01;
const HAS_BUTTONS = 0x02;
const IS_RELEASE = 0x10;

export const TuiEventType = {
  KeyboardEvent: 1,
  MouseEvent: 2,
  WheelEvent: 3,
  TermResizeEvent: 4,
} as const;
export type TuiEventType = Enum<typeof TuiEventType>;

export type TuiEvent = KeyboardEvent | MouseEvent | WheelEvent | TermResizeEvent;

// See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
// Binary layout: [modifiers:u8] [char_code:u16 LE] [key_len:u8] [key_bytes:u8*key_len]
export class KeyboardEvent {
  readonly key: string | undefined;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly charCode: number;

  constructor(buffer: ArrayBuffer) {
    const view = new TuiDataViewWrapper(buffer);
    const modifiers = view.getUint8(0);
    this.charCode = view.getUint16(1, true);
    const keyLength = view.getUint8(3);
    this.shiftKey = (modifiers & MOD_SHIFT) === MOD_SHIFT;
    this.ctrlKey = (modifiers & MOD_CTRL) === MOD_CTRL;
    this.altKey = (modifiers & MOD_ALT) === MOD_ALT;
    this.metaKey = (modifiers & MOD_META) === MOD_META;
    this.repeat = (modifiers & MOD_REPEAT) === MOD_REPEAT;
    if (keyLength > 0) {
      const keyBytes = new Uint8Array(buffer, 4, keyLength);
      this.key = new TextDecoder('utf-8').decode(keyBytes);
    } else {
      this.key = undefined;
    }
  }
}

// See https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
// Binary layout: [modifiers:u8] [flags:u8] [button:u8] [buttons:u8] [x:u16 LE] [y:u16 LE]
export class MouseEvent {
  static readonly LEFT_MOUSE_BUTTON = 0;
  static readonly MIDDLE_MOUSE_BUTTON = 1;
  static readonly RIGHT_MOUSE_BUTTON = 2;
  readonly button: number | undefined;
  readonly buttons: number | undefined;
  readonly x: number;
  readonly y: number;
  readonly isRelease: boolean;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;

  constructor(buffer: ArrayBuffer) {
    const view = new TuiDataViewWrapper(buffer);
    const modifiers = view.getUint8(0);
    const flags = view.getUint8(1);
    this.shiftKey = (modifiers & MOD_SHIFT) === MOD_SHIFT;
    this.ctrlKey = (modifiers & MOD_CTRL) === MOD_CTRL;
    this.altKey = (modifiers & MOD_ALT) === MOD_ALT;
    this.metaKey = (modifiers & MOD_META) === MOD_META;
    this.x = view.getUint16(4, true) - 1;
    this.y = view.getUint16(6, true) - 1;
    this.button = (flags & HAS_BUTTON) === HAS_BUTTON ? view.getUint8(2) : undefined;
    this.buttons = (flags & HAS_BUTTONS) === HAS_BUTTONS ? view.getUint8(3) : undefined;
    this.isRelease = (flags & IS_RELEASE) === IS_RELEASE;
  }
}

// See https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent
// Binary layout: same as MouseEvent (8 bytes) + [wheel_delta_y:i8]
export class WheelEvent extends MouseEvent {
  readonly wheelDeltaY: number;

  constructor(buffer: ArrayBuffer) {
    super(buffer);
    const view = new TuiDataViewWrapper(buffer);
    this.wheelDeltaY = view.getInt8(8);
  }
}

export class TermResizeEvent {
  readonly rows: number;
  readonly cols: number;

  constructor(buffer: ArrayBuffer) {
    const view = new TuiDataViewWrapper(buffer);
    this.rows = view.getUint16(0, true);
    this.cols = view.getUint16(2, true);
  }
}

export type EventSchema = {
  parse(buffer: ArrayBuffer): TuiEvent;
};

export type TuiEventMap = {
  [TuiEventType.KeyboardEvent]: KeyboardEvent;
  [TuiEventType.MouseEvent]: MouseEvent;
  [TuiEventType.WheelEvent]: WheelEvent;
  [TuiEventType.TermResizeEvent]: TermResizeEvent;
};

export type InferEvent<T extends TuiEventType> = TuiEventMap[T];
