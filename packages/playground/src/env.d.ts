// Global TUI type declarations — no import/export so these are available everywhere.

// ---- Shared Value Types ----
// Matches core/src/widgets/types.ts and core/src/utils/color.ts
type TuiSizeValue = number | `${number}%`;
type TuiColor = number | string;

// ---- Event Payload Types ----

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
