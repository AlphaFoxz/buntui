import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import {compile} from '@buntui/compiler';

const result = await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  target: 'bun',
  plugins: [
    {
      name: 'buntui-vue',
      setup(build) {
        build.onLoad({filter: /\.vue$/v}, async args => {
          const source = await Bun.file(args.path).text();
          const compiled = compile(source, {
            filename: args.path,
            codegen: {
              coreModuleId: '@buntui/core',
              reactivityModuleId: '@vue/reactivity',
              widgetModuleMap: {
                createFrameRateWatcher: '@buntui/extensions',
                createMatrixWidget: '@buntui/extensions',
              },
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

  // eslint-disable-next-line unicorn/no-process-exit -- build script is a CLI app
  process.exit(1);
}

for (const output of result.outputs) {
  console.log(`Built: ${output.path} (${(output.size / 1024).toFixed(1)} KB)`);
}

// Copy native DLL to dist so the output is self-contained
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
const dllSearchPaths = [
  path.resolve(import.meta.dir, '..', '..', 'native', 'zig-out', 'bin', binaryName),
  path.resolve(import.meta.dir, '..', binaryName),
];

for (const candidate of dllSearchPaths) {
  if (fs.existsSync(candidate)) {
    const dest = path.resolve(import.meta.dir, '..', 'dist', binaryName);
    fs.copyFileSync(candidate, dest);
    console.log(`Copied: ${binaryName} -> dist/`);
    if (process.platform === 'win32') {
      const pdbSrc = candidate.replace(/\.dll$/v, '.pdb');
      if (fs.existsSync(pdbSrc)) {
        fs.copyFileSync(pdbSrc, dest.replace(/\.dll$/v, '.pdb'));
      }
    }

    break;
  }
}
