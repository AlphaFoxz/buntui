import {compile} from 'compiler';

const result = await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  target: 'bun',
  external: ['core', '@vue/reactivity', 'native'],
  plugins: [
    {
      name: 'term-bed-vue',
      setup(build) {
        build.onLoad({filter: /\.vue$/v}, async args => {
          const source = await Bun.file(args.path).text();
          const compiled = compile(source, {
            filename: args.path,
            codegen: {coreModuleId: 'core', reactivityModuleId: '@vue/reactivity'},
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

  process.exit(1);
}

for (const output of result.outputs) {
  console.log(`Built: ${output.path} (${(output.size / 1024).toFixed(1)} KB)`);
}
