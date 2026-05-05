/**
 * Runtime helper function names used in generated code.
 * These are imported from the `core` package at runtime.
 */
export const RUNTIME_HELPERS = {
  // Widget creation
  CREATE_BOX: 'createBox',
  CREATE_TEXT: 'createTextWidget',
  CREATE_FRAME_RATE_WATCHER: 'createFrameRateWatcher',
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
 * Map of PascalCase template tag names to their core package widget creators.
 */
export const WIDGET_TAG_MAP: Record<string, string> = {
  Box: RUNTIME_HELPERS.CREATE_BOX,
  Text: RUNTIME_HELPERS.CREATE_TEXT,
  FrameRateWatcher: RUNTIME_HELPERS.CREATE_FRAME_RATE_WATCHER,
  Input: RUNTIME_HELPERS.CREATE_INPUT,
  Button: RUNTIME_HELPERS.CREATE_BUTTON,
  Checkbox: RUNTIME_HELPERS.CREATE_CHECKBOX,
  RadioGroup: RUNTIME_HELPERS.CREATE_RADIO_GROUP,
  SelectButton: RUNTIME_HELPERS.CREATE_SELECT_BUTTON,
  Switch: RUNTIME_HELPERS.CREATE_SWITCH,
  ScrollBox: RUNTIME_HELPERS.CREATE_SCROLL_BOX,
  ProgressBar: RUNTIME_HELPERS.CREATE_PROGRESS_BAR,
  Matrix: 'createMatrixWidget',
} as const;
