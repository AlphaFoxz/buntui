import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import {compile, CORE_REGISTRY} from '@buntui/compiler';
import {getBinaryPath} from '@buntui/native';

const result = await Bun.build({
  entrypoints: ['src/main.ts'],
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

  process.exit(1);
}

for (const output of result.outputs) {
  console.log(`Built: ${output.path} (${(output.size / 1024).toFixed(1)} KB)`);
}

function getBinaryExt(): string {
  if (process.platform === 'win32') return 'dll';
  if (process.platform === 'darwin') return 'dylib';
  return 'so';
}

const binaryName = `buntui.${getBinaryExt()}`;
const nativePath = getBinaryPath();
const dllSearchPaths = [
  ...(nativePath ? [nativePath] : []),
  path.resolve(import.meta.dir, '..', 'node_modules', '@buntui', 'core', binaryName),
  path.resolve(import.meta.dir, '..', binaryName),
];

for (const candidate of dllSearchPaths) {
  if (fs.existsSync(candidate)) {
    const dest = path.resolve(import.meta.dir, '..', 'dist', binaryName);
    fs.copyFileSync(candidate, dest);
    console.log(`Copied: ${binaryName} -> dist/`);
    break;
  }
}
