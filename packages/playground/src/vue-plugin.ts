import {compile} from '@buntui/compiler';
import {type BunPlugin, type PluginBuilder} from 'bun';

function buntuiVuePlugin(): BunPlugin {
  return {
    name: 'buntui-vue',
    setup(build: PluginBuilder) {
      build.onLoad({filter: /\.vue$/v}, async args => {
        const source = await Bun.file(args.path).text();
        const result = compile(source, {
          filename: args.path,
          codegen: {coreModuleId: '@buntui/core', reactivityModuleId: '@vue/reactivity'},
        });
        return {contents: result.code, loader: 'ts'};
      });
    },
  };
}

void Bun.plugin(buntuiVuePlugin());

export {buntuiVuePlugin};
