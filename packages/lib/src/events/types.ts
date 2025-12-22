export enum EventType {
    KeyboardEvent = 1,
    MouseEvent = 2,
    WheelEvent = 3,
}

// See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
export class KeyboardEvent {
    readonly key: string | null;
    readonly shiftKey: boolean;
    readonly ctrlKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;
    readonly repeat: boolean;
    readonly charCode: number;

    constructor(json: Record<string, any>) {
        this.key = json.key;
        this.shiftKey = json.shiftKey;
        this.ctrlKey = json.ctrlKey;
        this.altKey = json.altKey;
        this.metaKey = json.metaKey;
        this.repeat = json.repeat;
        this.charCode = json.charCode;
    }
}

// See https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
export class MouseEvent {
    static readonly LEFT_MOUSE_BUTTON = 0;
    static readonly MIDDLE_MOUSE_BUTTON = 1;
    static readonly RIGHT_MOUSE_BUTTON = 2;
    readonly button: number | null;
    readonly buttons: number | null;
    readonly x: number;
    readonly y: number;
    readonly shiftKey: boolean;
    readonly ctrlKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;

    constructor(json: Record<string, any>) {
        this.button = json.button;
        this.buttons = json.buttons;
        this.x = json.x;
        this.y = json.y;
        this.shiftKey = json.shiftKey;
        this.ctrlKey = json.ctrlKey;
        this.altKey = json.altKey;
        this.metaKey = json.metaKey;
    }
}

// See https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent
export class WheelEvent extends MouseEvent {
    readonly wheelDeltaY: number;

    constructor(json: Record<string, any>) {
        super(json);
        this.wheelDeltaY = json.wheelDeltaY;
    }
}

export interface EventSchema {
    parse(buffer: ArrayBuffer): any;
}

export type InferEvent<T> = T extends 1
    ? KeyboardEvent
    : T extends 2
    ? MouseEvent
    : T extends 3
    ? WheelEvent
    : any;
