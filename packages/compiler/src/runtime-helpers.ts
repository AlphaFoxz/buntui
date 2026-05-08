/**
 * Runtime helper function names used in generated code.
 * These are imported from the `core` package at runtime.
 */
export const RUNTIME_HELPERS = {
  // Widget creation
  CREATE_BOX: 'createBox',
  CREATE_TEXT: 'createTextWidget',
  CREATE_INPUT: 'createInputWidget',
  CREATE_BUTTON: 'createButtonWidget',
  CREATE_CHECKBOX: 'createCheckboxWidget',
  CREATE_RADIO_GROUP: 'createRadioGroupWidget',
  CREATE_SELECT_BUTTON: 'createSelectButtonWidget',
  CREATE_SWITCH: 'createSwitchWidget',
  CREATE_SCROLL_BOX: 'createScrollBoxWidget',
  CREATE_PROGRESS_BAR: 'createProgressBarWidget',

  // App & scene
  CREATE_APP: 'createApp',

  // Reactivity
  REF: 'ref',
  EFFECT: 'effect',
  COMPUTED: 'computed',
} as const;

/**
 * Component registry entry: maps a template tag to its creator function and module source.
 */
export type TuiComponentRegistry = Record<string, {
  creator: string;
  module: string;
}>;

/**
 * Built-in registry for core widgets. Extensions and custom widgets
 * must be merged by the user at compile time for tree-shaking.
 */
export const CORE_REGISTRY: TuiComponentRegistry = {
  Box: {creator: RUNTIME_HELPERS.CREATE_BOX, module: '@buntui/core'},
  Text: {creator: RUNTIME_HELPERS.CREATE_TEXT, module: '@buntui/core'},
  Input: {creator: RUNTIME_HELPERS.CREATE_INPUT, module: '@buntui/core'},
  Button: {creator: RUNTIME_HELPERS.CREATE_BUTTON, module: '@buntui/core'},
  Checkbox: {creator: RUNTIME_HELPERS.CREATE_CHECKBOX, module: '@buntui/core'},
  RadioGroup: {creator: RUNTIME_HELPERS.CREATE_RADIO_GROUP, module: '@buntui/core'},
  SelectButton: {creator: RUNTIME_HELPERS.CREATE_SELECT_BUTTON, module: '@buntui/core'},
  Switch: {creator: RUNTIME_HELPERS.CREATE_SWITCH, module: '@buntui/core'},
  ScrollBox: {creator: RUNTIME_HELPERS.CREATE_SCROLL_BOX, module: '@buntui/core'},
  ProgressBar: {creator: RUNTIME_HELPERS.CREATE_PROGRESS_BAR, module: '@buntui/core'},
};
