import {compile} from 'compiler';

type BunPluginBuilder = {
  onLoad: (args: {filter: RegExp}, callback: (args: {path: string}) => Promise<{contents: string; loader: string}>) => void;
};

function termBedVuePlugin(): {name: string; setup: (build: BunPluginBuilder) => void} {
  return {
    name: 'term-bed-vue',
    setup(build: BunPluginBuilder) {
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
export type {BunPluginBuilder};
