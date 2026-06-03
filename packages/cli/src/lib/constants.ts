import {type CompileOptions, CORE_REGISTRY} from '@buntui/compiler';

export const APPS_DIR = 'src/apps';

export const DEFAULT_COMPILE_OPTIONS: CompileOptions = {
  registry: CORE_REGISTRY,
  codegen: {
    coreModuleId: '@buntui/core',
    reactivityModuleId: '@vue/reactivity',
  },
};
