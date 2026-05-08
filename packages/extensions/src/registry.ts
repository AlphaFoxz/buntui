type TuiComponentRegistry = Record<string, {creator: string; module: string}>;

export const EXTENSION_REGISTRY: TuiComponentRegistry = {
  FrameRateWatcher: {creator: 'createFrameRateWatcher', module: '@buntui/extensions'},
  Matrix: {creator: 'createMatrixWidget', module: '@buntui/extensions'},
};
