import type { Pointer } from 'bun:ffi';

export interface Disposable {
    dispose(disposeWidgets?: boolean): void | Promise<void>;
    [Symbol.dispose](): void;
    [Symbol.asyncDispose](): void;
}

export interface CStruct {
    readonly ptr: Pointer;
    setPtr?: never;
}

export interface Entity {
    readonly id: bigint;
    setId?: never;
}

export interface Mountable {
    mounted(): void;
    unmounted(): void;
}

export interface WidgetLike<T> extends Entity, Mountable {
    readonly baseInfo: T;
}

export interface RectWidgetInfo {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    visible: boolean;
}

export interface RectWidget extends WidgetLike<RectWidgetInfo> {}

export function isRectWidget(widget: WidgetLike<any>): widget is RectWidget {
    return (
        'baseInfo' in widget &&
        typeof widget.baseInfo === 'object' &&
        'x' in widget.baseInfo! &&
        'y' in widget.baseInfo! &&
        'width' in widget.baseInfo! &&
        'height' in widget.baseInfo! &&
        'zIndex' in widget.baseInfo! &&
        'visible' in widget.baseInfo
    );
}

export type DataType =
    | 'u8'
    | 'i8'
    | 'u16'
    | 'i16'
    | 'u32'
    | 'i32'
    | 'u64'
    | 'i64'
    | 'f32'
    | 'f64'
    | 'pointer';
