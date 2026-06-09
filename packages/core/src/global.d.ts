import type {DefineComponent} from 'vue';
import type {TuiThemedColorRef} from './theme/themed-color';
import type {TuiColorString} from './utils/color';

declare global {
  type TuiSizeValue = number | `${number}%`;
  type TuiColor = number | TuiColorString | TuiThemedColorRef;

  type TuiPointerEvent = {
    readonly x: number;
    readonly y: number;
    readonly button: number | undefined;
    readonly buttons: number | undefined;
    readonly isRelease: boolean;
    readonly shiftKey: boolean;
    readonly ctrlKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;
  };

  type TuiWheelEvent = TuiPointerEvent & {
    readonly wheelDeltaY: number;
  };

  type TuiCheckboxChangeEvent = {checked: boolean; indeterminate: boolean};
  type TuiSwitchChangeEvent = {checked: boolean};
  type TuiInputEvent = {value: string};
  type TuiSubmitEvent = {value: string};
  type TuiClipboardEvent = {text: string};
  type TuiUndoEvent = {value: string};
  type TuiRedoEvent = {value: string};
  type TuiScrollEvent = {scrollOffsetY: number; maxScrollY: number};
  type TuiRadioGroupChangeEvent = {value: number; label: string};
  type TuiSelectChangeEvent = {value: string; label: string};
  type TuiSelectButtonChangeEvent = {value: unknown; label: string};
  type TuiTableRowSelectEvent = {index: number; row: Record<string, unknown>};
  type TuiTableRowActivateEvent = {index: number; row: Record<string, unknown>};

  type TuiBorderStyle = 'none' | 'solid' | 'double' | 'rounded' | 'bold' | 'dashed' | 'dotted' | 'outsetbold' | 'outsetdouble';
  type TuiLayoutDirection = 'horizontal' | 'vertical';
  type TuiLayoutAlignment = 'start' | 'center' | 'end' | 'stretch';
  type TuiBorderSides = boolean | 'true' | 'false' | `${number}` | `${number} ${number}` | `${number} ${number} ${number}` | `${number} ${number} ${number} ${number}`;
  type TuiFontStyle = 'bold' | 'dim' | 'italic' | 'underline' | 'slowblink' | 'rapidblink' | 'reverse' | 'hidden' | 'crossedout' | 'fraktur' | 'overline';

  type TuiBoxProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    colorFg?: TuiColor;
    colorBg?: TuiColor;
    border?: TuiBorderSides;
    colorBorder?: TuiColor;
    borderStyle?: TuiBorderStyle;
    borderTop?: boolean;
    borderRight?: boolean;
    borderBottom?: boolean;
    borderLeft?: boolean;
    zIndex?: number;
    styleModifier?: TuiFontStyle | TuiFontStyle[];
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    colorShadow?: TuiColor;
    shadowCovered?: boolean;
    draggable?: boolean;
    direction?: TuiLayoutDirection;
    gap?: number;
    align?: TuiLayoutAlignment;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
  };

  type TuiTextProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    colorFg?: TuiColor;
    colorBg?: TuiColor;
    zIndex?: number;
    styleModifier?: TuiFontStyle | TuiFontStyle[];
    value?: string;
    overflow?: 'clip' | 'marquee';
    scrollSpeed?: number;
    scrollPauseMs?: number;
  };

  type TuiInputProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    colorFg?: TuiColor;
    colorBg?: TuiColor;
    placeholder?: string;
    colorPlaceholder?: TuiColor;
    value?: string;
    type?: 'text' | 'password' | 'number';
    min?: number;
    max?: number;
    step?: number;
    modelValue?: string;
    label?: string;
    colorBorderUnfocused?: TuiColor;
    colorBorderFocused?: TuiColor;
    borderStyle?: TuiBorderStyle;
    maxLength?: number;
    colorSelectionBg?: TuiColor;
    colorSelectionFg?: TuiColor;
    readonly?: boolean;
    disabled?: boolean;
    colorFgDisabled?: TuiColor;
    colorBgDisabled?: TuiColor;
    colorBorderDisabled?: TuiColor;
  };

  type TuiButtonProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    value?: string;
    disabled?: boolean;
    colorFgNormal?: TuiColor;
    colorBgNormal?: TuiColor;
    colorBorderNormal?: TuiColor;
    borderStyleNormal?: TuiBorderStyle;
    colorFgHovered?: TuiColor;
    colorBgHovered?: TuiColor;
    colorBorderHovered?: TuiColor;
    borderStyleHovered?: TuiBorderStyle;
    colorFgFocused?: TuiColor;
    colorBgFocused?: TuiColor;
    colorBorderFocused?: TuiColor;
    borderStyleFocused?: TuiBorderStyle;
    colorFgPressed?: TuiColor;
    colorBgPressed?: TuiColor;
    colorBorderPressed?: TuiColor;
    borderStylePressed?: TuiBorderStyle;
    colorFgDisabled?: TuiColor;
    colorBgDisabled?: TuiColor;
    colorBorderDisabled?: TuiColor;
    borderStyleDisabled?: TuiBorderStyle;
  };

  type TuiCheckboxProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    label?: string;
    checked?: boolean;
    indeterminate?: boolean;
    modelValue?: boolean;
    disabled?: boolean;
    colorFgNormal?: TuiColor;
    colorBgNormal?: TuiColor;
    colorFgHovered?: TuiColor;
    colorBgHovered?: TuiColor;
    colorFgFocused?: TuiColor;
    colorBgFocused?: TuiColor;
    colorFgDisabled?: TuiColor;
    colorBgDisabled?: TuiColor;
  };

  type TuiRadioGroupProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    options?: readonly string[];
    value?: number;
    modelValue?: number;
    disabled?: boolean;
    colorFgNormal?: TuiColor;
    colorBgNormal?: TuiColor;
    colorFgFocused?: TuiColor;
    colorBgFocused?: TuiColor;
    colorFgDisabled?: TuiColor;
    colorBgDisabled?: TuiColor;
    colorFgSelected?: TuiColor;
    colorBgSelected?: TuiColor;
  };

  type TuiSelectButtonProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    options?: unknown[];
    value?: unknown;
    modelValue?: unknown;
    disabled?: boolean;
    colorFgNormal?: TuiColor;
    colorBgNormal?: TuiColor;
    colorFgActive?: TuiColor;
    colorBgActive?: TuiColor;
    colorFgFocused?: TuiColor;
    colorBgFocused?: TuiColor;
    colorFgDisabled?: TuiColor;
    colorBgDisabled?: TuiColor;
    colorFgSeparator?: TuiColor;
  };

  type TuiSwitchProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    label?: string;
    checked?: boolean;
    modelValue?: boolean;
    disabled?: boolean;
    colorFgNormal?: TuiColor;
    colorBgNormal?: TuiColor;
    colorCrossNormal?: TuiColor;
    colorCheckNormal?: TuiColor;
    colorDimNormal?: TuiColor;
    colorFgHovered?: TuiColor;
    colorBgHovered?: TuiColor;
    colorCrossHovered?: TuiColor;
    colorCheckHovered?: TuiColor;
    colorDimHovered?: TuiColor;
    colorFgFocused?: TuiColor;
    colorBgFocused?: TuiColor;
    colorCrossFocused?: TuiColor;
    colorCheckFocused?: TuiColor;
    colorDimFocused?: TuiColor;
    colorFgDisabled?: TuiColor;
    colorBgDisabled?: TuiColor;
    colorCrossDisabled?: TuiColor;
    colorCheckDisabled?: TuiColor;
    colorDimDisabled?: TuiColor;
  };

  type TuiScrollBoxProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    colorFg?: TuiColor;
    colorBg?: TuiColor;
    colorBorder?: TuiColor;
    borderStyle?: TuiBorderStyle;
    borderTop?: boolean;
    borderRight?: boolean;
    borderBottom?: boolean;
    borderLeft?: boolean;
    colorShadow?: TuiColor;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowCovered?: boolean;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    gap?: number;
    scrollSpeed?: number;
    alwaysShowScrollbar?: boolean;
    colorScrollbar?: TuiColor;
    colorScrollbarTrack?: TuiColor;
  };

  type TuiProgressProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    value?: number;
    max?: number;
    disabled?: boolean;
    colorTrackNormal?: TuiColor;
    colorFillNormal?: TuiColor;
    colorTrackDisabled?: TuiColor;
    colorFillDisabled?: TuiColor;
  };

  type TuiBaseEmits = {
    click: (data: TuiPointerEvent) => void;
    mousedown: (data: TuiPointerEvent) => void;
    mouseup: (data: TuiPointerEvent) => void;
    mouseover: (data: TuiPointerEvent) => void;
    mouseout: (data: TuiPointerEvent) => void;
    mousemove: (data: TuiPointerEvent) => void;
    contextmenu: (data: TuiPointerEvent) => void;
    dragstart: (data: TuiPointerEvent) => void;
    drag: (data: TuiPointerEvent) => void;
    dragend: (data: TuiPointerEvent) => void;
    wheel: (data: TuiWheelEvent) => void;
  };

  type TuiInteractiveEmits = TuiBaseEmits & {
    focus: () => void;
    blur: () => void;
  };

  type TuiScrollBoxEmits = TuiInteractiveEmits & {
    scroll: (data: {scrollOffsetY: number; maxScrollY: number}) => void;
  };

  type TuiCheckboxEmits = TuiInteractiveEmits & {
    change: (data: TuiCheckboxChangeEvent) => void;
    'update:modelValue': (value: boolean) => void;
  };

  type TuiSwitchEmits = TuiInteractiveEmits & {
    change: (data: TuiSwitchChangeEvent) => void;
    'update:modelValue': (value: boolean) => void;
  };

  type TuiInputEmits = TuiInteractiveEmits & {
    input: (data: TuiInputEvent) => void;
    submit: (data: TuiSubmitEvent) => void;
    'update:modelValue': (value: string) => void;
  };

  type TuiRadioGroupEmits = TuiInteractiveEmits & {
    change: (data: TuiRadioGroupChangeEvent) => void;
    'update:modelValue': (value: number) => void;
  };

  type TuiSelectButtonEmits = TuiInteractiveEmits & {
    change: (data: TuiSelectButtonChangeEvent) => void;
    'update:modelValue': (value: string) => void;
  };

  type TuiTextareaEmits = TuiInteractiveEmits & {
    input: (data: TuiInputEvent) => void;
    submit: (data: TuiSubmitEvent) => void;
    'update:modelValue': (value: string) => void;
  };

  type TuiTableEmits = TuiInteractiveEmits & {
    rowSelect: (data: {index: number; row: Record<string, unknown>}) => void;
    rowActivate: (data: {index: number; row: Record<string, unknown>}) => void;
  };

  type TuiSelectEmits = TuiInteractiveEmits & {
    change: (data: TuiSelectChangeEvent) => void;
    open: () => void;
    close: () => void;
    'update:modelValue': (value: string) => void;
  };

  type TuiTextareaProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    colorFg?: TuiColor;
    colorBg?: TuiColor;
    placeholder?: string;
    colorPlaceholder?: TuiColor;
    value?: string;
    modelValue?: string;
    label?: string;
    colorBorderUnfocused?: TuiColor;
    colorBorderFocused?: TuiColor;
    borderStyle?: TuiBorderStyle;
    maxLength?: number;
    colorSelectionBg?: TuiColor;
    colorSelectionFg?: TuiColor;
    readonly?: boolean;
    disabled?: boolean;
    colorFgDisabled?: TuiColor;
    colorBgDisabled?: TuiColor;
  };

  type TuiTableProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    colorFg?: TuiColor;
    colorBg?: TuiColor;
    borderStyle?: TuiBorderStyle;
    columns?: Array<{key: string; label?: string; width?: number; align?: 'left' | 'center' | 'right'}>;
    rows?: Array<Record<string, unknown>>;
    disabled?: boolean;
  };

  type TuiSelectProps = {
    x?: TuiSizeValue;
    y?: TuiSizeValue;
    width?: TuiSizeValue;
    height?: TuiSizeValue;
    options?: Array<{value: string; label: string}>;
    value?: string;
    modelValue?: string;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    colorFgNormal?: TuiColor;
    colorBgNormal?: TuiColor;
    colorFgFocused?: TuiColor;
    colorBgFocused?: TuiColor;
    colorFgHovered?: TuiColor;
    colorBgHovered?: TuiColor;
    colorFgDisabled?: TuiColor;
    colorBgDisabled?: TuiColor;
    colorBorderUnfocused?: TuiColor;
    colorBorderFocused?: TuiColor;
    colorBorderDisabled?: TuiColor;
    borderStyle?: TuiBorderStyle;
    colorFgItem?: TuiColor;
    colorBgItem?: TuiColor;
    colorFgItemSelected?: TuiColor;
    colorBgItemSelected?: TuiColor;
    colorFgItemHovered?: TuiColor;
    colorBgItemHovered?: TuiColor;
  };

  type _Empty = Record<string, never>;
  type TuiComponent<P, E extends Record<string, ((...args: any[]) => any) | null>>
    = DefineComponent<P & {ref?: string}, _Empty, _Empty, _Empty, _Empty, _Empty, _Empty, E>;
}

declare module 'vue' {
  export type GlobalComponents = {
    Box: TuiComponent<TuiBoxProps, TuiBaseEmits>;
    Text: TuiComponent<TuiTextProps, TuiBaseEmits>;
    Input: TuiComponent<TuiInputProps, TuiInputEmits>;
    Button: TuiComponent<TuiButtonProps, TuiInteractiveEmits>;
    Checkbox: TuiComponent<TuiCheckboxProps, TuiCheckboxEmits>;
    RadioGroup: TuiComponent<TuiRadioGroupProps, TuiRadioGroupEmits>;
    SelectButton: TuiComponent<TuiSelectButtonProps, TuiSelectButtonEmits>;
    Switch: TuiComponent<TuiSwitchProps, TuiSwitchEmits>;
    ScrollBox: TuiComponent<TuiScrollBoxProps, TuiScrollBoxEmits>;
    Progress: TuiComponent<TuiProgressProps, TuiBaseEmits>;
    Textarea: TuiComponent<TuiTextareaProps, TuiTextareaEmits>;
    Table: TuiComponent<TuiTableProps, TuiTableEmits>;
    Select: TuiComponent<TuiSelectProps, TuiSelectEmits>;
  };
}

export {};
