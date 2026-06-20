import type {Plugin} from 'vite';
import {compile} from '@buntui/compiler';
import {DEFAULT_COMPILE_OPTIONS} from './constants.ts';

const VIRTUAL_MODULE_ID = 'virtual:buntui-dev';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_ID}`;

export type BuntuiDevConfig = {
  appName: string;
  appOptions: Record<string, unknown>;
};

export async function createBuntuiVitePlugin(devConfig?: BuntuiDevConfig): Promise<Plugin> {
  await import('vite');

  return {
    name: 'buntui-sfc',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_ID;
      }
    },
    async load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        const {appName, appOptions} = devConfig ?? {appName: '', appOptions: {}};
        return `export const appName = ${JSON.stringify(appName)};\nexport const appOptions = ${JSON.stringify(appOptions)};`;
      }

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
