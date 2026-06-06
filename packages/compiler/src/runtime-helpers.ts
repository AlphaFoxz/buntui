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
  CREATE_PROGRESS: 'createProgressWidget',
  CREATE_TEXTAREA: 'createTextareaWidget',
  CREATE_TABLE: 'createTableWidget',
  CREATE_SELECT: 'createSelectWidget',

  // App & scene
  CREATE_APP: 'createApp',

  // Reactivity
  REF: 'ref',
  EFFECT: 'effect',
  COMPUTED: 'computed',
  UNREF: 'unref',
} as const;

export type PropHandler = {
  method: string;
  field?: string;
};

type PropHandlers = Record<string, PropHandler>;

const PH_RECT: PropHandlers = {
  x: {method: 'updateRect', field: 'x'},
  y: {method: 'updateRect', field: 'y'},
  width: {method: 'updateRect', field: 'width'},
  height: {method: 'updateRect', field: 'height'},
};

const PH_COLOR: PropHandlers = {
  colorFg: {method: 'updateColor', field: 'colorFg'},
  colorBg: {method: 'updateColor', field: 'colorBg'},
};

const PH_STYLE: PropHandlers = {
  zIndex: {method: 'updateStyle', field: 'styleZIndex'},
  styleModifier: {method: 'updateStyle', field: 'styleModifier'},
};

const PH_BORDER_FULL: PropHandlers = {
  border: {method: 'updateBorder', field: 'border'},
  colorBorder: {method: 'updateBorder', field: 'colorBorder'},
  borderStyle: {method: 'updateBorder', field: 'borderStyle'},
  borderTop: {method: 'updateBorder', field: 'borderTop'},
  borderRight: {method: 'updateBorder', field: 'borderRight'},
  borderBottom: {method: 'updateBorder', field: 'borderBottom'},
  borderLeft: {method: 'updateBorder', field: 'borderLeft'},
};

const PH_BORDER_STYLE_ONLY: PropHandlers = {
  borderStyle: {method: 'updateBorder', field: 'borderStyle'},
};

const PH_SHADOW: PropHandlers = {
  shadowOffsetX: {method: 'updateShadow', field: 'shadowOffsetX'},
  shadowOffsetY: {method: 'updateShadow', field: 'shadowOffsetY'},
  colorShadow: {method: 'updateShadow', field: 'colorShadow'},
  shadowCovered: {method: 'updateShadow', field: 'shadowCovered'},
};

const PH_PADDING: PropHandlers = {
  paddingTop: {method: 'updatePadding', field: 'paddingTop'},
  paddingBottom: {method: 'updatePadding', field: 'paddingBottom'},
  paddingLeft: {method: 'updatePadding', field: 'paddingLeft'},
  paddingRight: {method: 'updatePadding', field: 'paddingRight'},
};

const PH_VISIBLE: PropHandlers = {visible: {method: 'setVisible'}};
const PH_DRAGGABLE: PropHandlers = {draggable: {method: 'setDraggable'}};
const PH_DISABLED: PropHandlers = {disabled: {method: 'setDisabled'}};

export type TuiComponentRegistry = Record<string, {
  creator: string;
  module: string;
  propHandlers?: PropHandlers;
}>;

const BOX_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT, ...PH_COLOR, ...PH_STYLE, ...PH_BORDER_FULL, ...PH_SHADOW, ...PH_PADDING,
  direction: {method: 'setDirection'},
  gap: {method: 'setGap'},
  align: {method: 'setAlign'},
  ...PH_DRAGGABLE, ...PH_VISIBLE,
};

const TEXT_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT, ...PH_COLOR, ...PH_STYLE,
  value: {method: 'updateValue'},
  scrollSpeed: {method: 'setScrollSpeed'},
  scrollPauseMs: {method: 'setScrollPauseMs'},
  ...PH_DRAGGABLE, ...PH_VISIBLE,
};

const INPUT_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT, ...PH_COLOR, ...PH_BORDER_STYLE_ONLY,
  value: {method: 'updateValue'},
  min: {method: 'setMin'},
  max: {method: 'setMax'},
  step: {method: 'setStep'},
  maxLength: {method: 'setMaxLength'},
  placeholder: {method: 'setPlaceholder'},
  label: {method: 'setLabel'},
  readonly: {method: 'setReadonly'},
  ...PH_DISABLED, ...PH_VISIBLE,
};

const BUTTON_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT,
  value: {method: 'updateValue'},
  colorFgNormal: {method: 'updateNormalStyle', field: 'colorFgNormal'},
  colorBgNormal: {method: 'updateNormalStyle', field: 'colorBgNormal'},
  colorBorderNormal: {method: 'updateNormalStyle', field: 'colorBorderNormal'},
  borderStyleNormal: {method: 'updateNormalStyle', field: 'borderStyleNormal'},
  colorFgHovered: {method: 'updateHoveredStyle', field: 'colorFgHovered'},
  colorBgHovered: {method: 'updateHoveredStyle', field: 'colorBgHovered'},
  colorBorderHovered: {method: 'updateHoveredStyle', field: 'colorBorderHovered'},
  borderStyleHovered: {method: 'updateHoveredStyle', field: 'borderStyleHovered'},
  colorFgPressed: {method: 'updatePressedStyle', field: 'colorFgPressed'},
  colorBgPressed: {method: 'updatePressedStyle', field: 'colorBgPressed'},
  colorBorderPressed: {method: 'updatePressedStyle', field: 'colorBorderPressed'},
  borderStylePressed: {method: 'updatePressedStyle', field: 'borderStylePressed'},
  ...PH_DISABLED, ...PH_VISIBLE,
};

const CHECKBOX_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT,
  checked: {method: 'setChecked'},
  indeterminate: {method: 'setIndeterminate'},
  label: {method: 'setLabel'},
  ...PH_DISABLED, ...PH_VISIBLE,
};

const SWITCH_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT,
  checked: {method: 'setChecked'},
  label: {method: 'setLabel'},
  ...PH_DISABLED, ...PH_VISIBLE,
};

const RADIO_GROUP_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT,
  value: {method: 'updateValue'},
  options: {method: 'setOptions'},
  tabs: {method: 'setOptions'},
  ...PH_DISABLED, ...PH_VISIBLE,
};

const SELECT_BUTTON_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT,
  value: {method: 'updateValue'},
  options: {method: 'setOptions'},
  tabs: {method: 'setOptions'},
  ...PH_DISABLED, ...PH_VISIBLE,
};

const SCROLL_BOX_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT, ...PH_COLOR, ...PH_BORDER_FULL, ...PH_SHADOW, ...PH_PADDING,
  gap: {method: 'setGap'},
  alwaysShowScrollbar: {method: 'setAlwaysShowScrollbar'},
  colorScrollbar: {method: 'setColorScrollbar'},
  colorScrollbarTrack: {method: 'setColorScrollbarTrack'},
  ...PH_DISABLED, ...PH_VISIBLE,
};

const PROGRESS_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT,
  value: {method: 'updateValue'},
  max: {method: 'setMax'},
  ...PH_DISABLED, ...PH_VISIBLE,
};

const TEXTAREA_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT, ...PH_COLOR, ...PH_BORDER_STYLE_ONLY,
  value: {method: 'updateValue'},
  maxLength: {method: 'setMaxLength'},
  placeholder: {method: 'setPlaceholder'},
  label: {method: 'setLabel'},
  readonly: {method: 'setReadonly'},
  ...PH_DISABLED, ...PH_VISIBLE,
};

const TABLE_PROP_HANDLERS: PropHandlers = {
  ...PH_RECT, ...PH_COLOR, ...PH_BORDER_STYLE_ONLY,
  columns: {method: 'setColumns'},
  rows: {method: 'setRows'},
  ...PH_DISABLED, ...PH_VISIBLE,
};

const SELECT_PROP_HANDLERS: PropHandlers = {
  x: {method: 'updateRect', field: 'x'},
  y: {method: 'updateRect', field: 'y'},
  width: {method: 'updateRect', field: 'width'},
  value: {method: 'updateValue'},
  options: {method: 'setOptions'},
  placeholder: {method: 'setPlaceholder'},
  label: {method: 'setLabel'},
  borderStyle: {method: 'updateBorder', field: 'borderStyle'},
  ...PH_DISABLED, ...PH_VISIBLE,
};

export const CORE_REGISTRY: TuiComponentRegistry = {
  Box: {creator: RUNTIME_HELPERS.CREATE_BOX, module: '@buntui/core', propHandlers: BOX_PROP_HANDLERS},
  Text: {creator: RUNTIME_HELPERS.CREATE_TEXT, module: '@buntui/core', propHandlers: TEXT_PROP_HANDLERS},
  Input: {creator: RUNTIME_HELPERS.CREATE_INPUT, module: '@buntui/core', propHandlers: INPUT_PROP_HANDLERS},
  Button: {creator: RUNTIME_HELPERS.CREATE_BUTTON, module: '@buntui/core', propHandlers: BUTTON_PROP_HANDLERS},
  Checkbox: {creator: RUNTIME_HELPERS.CREATE_CHECKBOX, module: '@buntui/core', propHandlers: CHECKBOX_PROP_HANDLERS},
  RadioGroup: {creator: RUNTIME_HELPERS.CREATE_RADIO_GROUP, module: '@buntui/core', propHandlers: RADIO_GROUP_PROP_HANDLERS},
  SelectButton: {creator: RUNTIME_HELPERS.CREATE_SELECT_BUTTON, module: '@buntui/core', propHandlers: SELECT_BUTTON_PROP_HANDLERS},
  Switch: {creator: RUNTIME_HELPERS.CREATE_SWITCH, module: '@buntui/core', propHandlers: SWITCH_PROP_HANDLERS},
  ScrollBox: {creator: RUNTIME_HELPERS.CREATE_SCROLL_BOX, module: '@buntui/core', propHandlers: SCROLL_BOX_PROP_HANDLERS},
  Progress: {creator: RUNTIME_HELPERS.CREATE_PROGRESS, module: '@buntui/core', propHandlers: PROGRESS_PROP_HANDLERS},
  Textarea: {creator: RUNTIME_HELPERS.CREATE_TEXTAREA, module: '@buntui/core', propHandlers: TEXTAREA_PROP_HANDLERS},
  Table: {creator: RUNTIME_HELPERS.CREATE_TABLE, module: '@buntui/core', propHandlers: TABLE_PROP_HANDLERS},
  Select: {creator: RUNTIME_HELPERS.CREATE_SELECT, module: '@buntui/core', propHandlers: SELECT_PROP_HANDLERS},
};
