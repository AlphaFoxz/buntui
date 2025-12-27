export enum EventType {
  KeyboardEvent = 1,
  MouseEvent = 2,
  WheelEvent = 3,
}

// See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
export class KeyboardEvent {
  readonly key: string | undefined;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly charCode: number;

  constructor(json: Record<string, any>) {
    this.key = json.key as string;
    this.shiftKey = json.shiftKey as boolean;
    this.ctrlKey = json.ctrlKey as boolean;
    this.altKey = json.altKey as boolean;
    this.metaKey = json.metaKey as boolean;
    this.repeat = json.repeat as boolean;
    this.charCode = json.charCode as number;
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

  constructor(json: Record<string, any>) {
    this.button = json.button as number;
    this.buttons = json.buttons as number;
    this.x = json.x as number;
    this.y = json.y as number;
    this.shiftKey = json.shiftKey as boolean;
    this.ctrlKey = json.ctrlKey as boolean;
    this.altKey = json.altKey as boolean;
    this.metaKey = json.metaKey as boolean;
  }
}

// See https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent
export class WheelEvent extends MouseEvent {
  readonly wheelDeltaY: number;

  constructor(json: Record<string, any>) {
    super(json);
    this.wheelDeltaY = json.wheelDeltaY as number;
  }
}

export type EventSchema = {
  parse(buffer: ArrayBuffer): any;
};

export type InferEvent<T> = T extends 1
  ? KeyboardEvent
  : T extends 2
    ? MouseEvent
    : T extends 3
      ? WheelEvent
      : any;
