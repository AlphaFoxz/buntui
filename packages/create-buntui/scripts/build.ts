import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import {compile, CORE_REGISTRY} from '@buntui/compiler';

const result = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  target: 'bun',
  minify: true,
  plugins: [
    {
      name: 'buntui-vue',
      setup(build) {
        build.onLoad({filter: /\.vue$/v}, async args => {
          const source = await Bun.file(args.path).text();
          const compiled = compile(source, {
            filename: args.path,
            registry: CORE_REGISTRY,
            codegen: {
              coreModuleId: '@buntui/core',
              reactivityModuleId: '@vue/reactivity',
            },
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

  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}

for (const output of result.outputs) {
  console.log(`Built: ${output.path} (${(output.size / 1024).toFixed(1)} KB)`);
}

function getBinaryExt(): string {
  if (process.platform === 'win32') {
    return 'dll';
  }

  if (process.platform === 'darwin') {
    return 'dylib';
  }

  return 'so';
}

const binaryName = `buntui.${getBinaryExt()}`;
const libPrefix = process.platform === 'win32' ? '' : 'lib';
const distName = `${libPrefix}${binaryName}`;
const dllSearchPaths = [
  path.resolve(import.meta.dir, '..', '..', 'native', 'binaries', `${process.platform}-${process.arch}`, binaryName),
  path.resolve(import.meta.dir, '..', '..', 'native', 'zig-out', 'bin', binaryName),
  path.resolve(import.meta.dir, '..', '..', 'native', 'zig-out', 'lib', distName),
];

for (const candidate of dllSearchPaths) {
  if (fs.existsSync(candidate)) {
    const dest = path.resolve(import.meta.dir, '..', 'dist', binaryName);
    fs.copyFileSync(candidate, dest);
    console.log(`Copied: ${binaryName} -> dist/`);
    break;
  }
}
