import {compile} from 'compiler';
import {type BunPlugin, type PluginBuilder} from 'bun';

function termBedVuePlugin(): BunPlugin {
  return {
    name: 'term-bed-vue',
    setup(build: PluginBuilder) {
      build.onLoad({filter: /\.vue$/v}, async args => {
        const source = await Bun.file(args.path).text();
        const result = compile(source, {
          filename: args.path,
          codegen: {coreModuleId: 'core', reactivityModuleId: '@vue/reactivity'},
        });
        return {contents: result.code, loader: 'ts'};
      });
    },
  };
}

void Bun.plugin(termBedVuePlugin());

export {termBedVuePlugin};
