// Barrel re-exports — for deep-import tree-shaking, import from sub-paths:
//   import {Matrix} from '@buntui/extensions/matrix'
export * from './matrix';
export * from './framerate';
export * from './snake';
export * from './videoplayer';

export {EXTENSION_REGISTRY} from './registry';
