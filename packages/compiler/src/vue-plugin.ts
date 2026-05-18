import {type BunPlugin, type PluginBuilder} from 'bun';
import {compile} from './compile';
import {CORE_REGISTRY} from './runtime-helpers';

function buntuiVuePlugin(): BunPlugin {
  return {
    name: 'buntui-vue',
    setup(build: PluginBuilder) {
      build.onLoad({filter: /\.vue$/v}, async args => {
        const source = await Bun.file(args.path).text();
        const result = compile(source, {
          filename: args.path,
          registry: CORE_REGISTRY,
          codegen: {coreModuleId: '@buntui/core', reactivityModuleId: '@vue/reactivity'},
        });
        return {contents: result.code, loader: 'ts'};
      });
    },
  };
}

void Bun.plugin(buntuiVuePlugin());

export {buntuiVuePlugin};
