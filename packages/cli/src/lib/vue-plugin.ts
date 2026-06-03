import {type BunPlugin, type PluginBuilder} from 'bun';
import {compile} from '@buntui/compiler';
import {DEFAULT_COMPILE_OPTIONS} from './constants.ts';

export function createVuePlugin(): BunPlugin {
  return {
    name: 'buntui-vue',
    setup(build: PluginBuilder) {
      build.onLoad({filter: /\.vue$/v}, async args => {
        const source = await Bun.file(args.path).text();
        const result = compile(source, {
          filename: args.path,
          ...DEFAULT_COMPILE_OPTIONS,
        });
        return {contents: result.code, loader: 'ts'};
      });
    },
  };
}
