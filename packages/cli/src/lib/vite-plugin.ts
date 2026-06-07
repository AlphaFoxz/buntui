import type {Plugin} from 'vite';
import {compile} from '@buntui/compiler';
import {DEFAULT_COMPILE_OPTIONS} from './constants.ts';

export async function createBuntuiVitePlugin(): Promise<Plugin> {
  await import('vite');

  return {
    name: 'buntui-sfc',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith('.vue')) {
        return;
      }

      const source = await Bun.file(id).text();
      const result = compile(source, {
        filename: id,
        ...DEFAULT_COMPILE_OPTIONS,
        sourceMap: true,
      });
      return {code: result.code, map: result.sourceMap ?? null};
    },
  };
}
