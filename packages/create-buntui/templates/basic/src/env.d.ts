type TuiSizeValue = number | `${number}%`;
type TuiColor = number | string;

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

type TuiCheckboxChangeEvent = {checked: boolean};
type TuiSwitchChangeEvent = {checked: boolean};
type TuiInputEvent = {value: string};
type TuiSubmitEvent = {value: string};
type TuiRadioGroupChangeEvent = {value: number; label: string};
type TuiSelectButtonChangeEvent = {value: unknown; label: string};
