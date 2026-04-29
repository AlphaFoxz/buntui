/**
 * Runtime helper function names used in generated code.
 * These are imported from the `core` package at runtime.
 */
export const RUNTIME_HELPERS = {
  // Widget creation
  CREATE_BOX: 'createBox',
  CREATE_FRAME_RATE_WATCHER: 'createFrameRateWatcher',

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
  FrameRateWatcher: RUNTIME_HELPERS.CREATE_FRAME_RATE_WATCHER,
} as const;
