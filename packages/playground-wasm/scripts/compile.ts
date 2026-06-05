import type {CompileOptions} from '@buntui/compiler';
import {compile, CORE_REGISTRY} from '@buntui/compiler';

export const COMPILE_OPTIONS: CompileOptions = {
  registry: CORE_REGISTRY,
  codegen: {
    coreModuleId: '@buntui/core',
    reactivityModuleId: '@vue/reactivity',
  },
};

export function compileSfc(source: string, filename: string): string {
  const result = compile(source, {...COMPILE_OPTIONS, filename});
  return result.code;
}
