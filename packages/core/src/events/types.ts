export const TuiEventType = {
  KeyboardEvent: 1,
  MouseEvent: 2,
  WheelEvent: 3,
  TermResizeEvent: 4,
} as const;
export type TuiEventType = Enum<typeof TuiEventType>;

export type TuiEvent = KeyboardEvent | MouseEvent | WheelEvent | TermResizeEvent;

// See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
export class KeyboardEvent {
  readonly key: string | undefined;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly charCode: number;

  constructor(json: Record<string, unknown>) {
    this.key = typeof json.key === 'string' ? json.key : undefined;
    this.shiftKey = Boolean(json.shiftKey);
    this.ctrlKey = Boolean(json.ctrlKey);
    this.altKey = Boolean(json.altKey);
    this.metaKey = Boolean(json.metaKey);
    this.repeat = Boolean(json.repeat);
    this.charCode = Number(json.charCode);
  }
}

// See https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
export class MouseEvent {
  static readonly LEFT_MOUSE_BUTTON = 0;
  static readonly MIDDLE_MOUSE_BUTTON = 1;
  static readonly RIGHT_MOUSE_BUTTON = 2;
  readonly button: number | undefined;
  readonly buttons: number | undefined;
  readonly x: number;
  readonly y: number;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;

  constructor(json: Record<string, unknown>) {
    this.button = typeof json.button === 'number' ? json.button : undefined;
    this.buttons = typeof json.buttons === 'number' ? json.buttons : undefined;
    this.x = Number(json.x);
    this.y = Number(json.y);
    this.shiftKey = Boolean(json.shiftKey);
    this.ctrlKey = Boolean(json.ctrlKey);
    this.altKey = Boolean(json.altKey);
    this.metaKey = Boolean(json.metaKey);
  }
}

// See https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent
export class WheelEvent extends MouseEvent {
  readonly wheelDeltaY: number;

  constructor(json: Record<string, unknown>) {
    super(json);
    this.wheelDeltaY = Number(json.wheelDeltaY);
  }
}

export class TermResizeEvent {
  readonly rows: number;
  readonly cols: number;

  constructor(json: Record<string, unknown>) {
    this.rows = Number(json.rows);
    this.cols = Number(json.cols);
  }
}

export type EventSchema = {
  parse(buffer: ArrayBuffer): any;
};

export type TuiEventMap = {
  [TuiEventType.KeyboardEvent]: KeyboardEvent;
  [TuiEventType.MouseEvent]: MouseEvent;
  [TuiEventType.WheelEvent]: WheelEvent;
  [TuiEventType.TermResizeEvent]: TermResizeEvent;
};

export type InferEvent<T extends TuiEventType> = TuiEventMap[T];
