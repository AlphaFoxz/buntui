import process from 'node:process';
import {compile} from '@buntui/compiler';

const result = await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  target: 'bun',
  external: ['@buntui/core', '@vue/reactivity', '@buntui/native', '@buntui/compiler', '@buntui/extensions'],
  plugins: [
    {
      name: 'buntui-vue',
      setup(build) {
        build.onLoad({filter: /\.vue$/v}, async args => {
          const source = await Bun.file(args.path).text();
          const compiled = compile(source, {
            filename: args.path,
            codegen: {coreModuleId: '@buntui/core', reactivityModuleId: '@vue/reactivity'},
          });
          return {contents: compiled.code, loader: 'ts'};
        });
      },
    },
  ],
});

if (!result.success) {
  for (const error of result.logs) {
    console.error(error);
  }

  // eslint-disable-next-line unicorn/no-process-exit -- build script is a CLI app
  process.exit(1);
}

for (const output of result.outputs) {
  console.log(`Built: ${output.path} (${(output.size / 1024).toFixed(1)} KB)`);
}
