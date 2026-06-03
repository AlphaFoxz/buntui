#!/usr/bin/env bun
import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import {compile, CORE_REGISTRY} from '@buntui/compiler';

const rootDir = path.join(import.meta.dir, '..');
const distDir = path.join(rootDir, 'dist');

fs.mkdirSync(distDir, {recursive: true});

const vuePlugin = {
    name: 'buntui-vue',
    setup(build: Bun.PluginBuilder) {
        build.onLoad({filter: /\.vue$/}, async args => {
            const source = await Bun.file(args.path).text();
            const compiled = compile(source, {
                filename: args.path,
                registry: CORE_REGISTRY,
                codegen: {coreModuleId: '@buntui/core', reactivityModuleId: '@vue/reactivity'},
            });
            return {contents: compiled.code, loader: 'ts'};
        });
    },
};

const result = await Bun.build({
    entrypoints: [path.join(rootDir, 'src', 'index.ts')],
    outdir: distDir,
    target: 'bun',
    minify: true,
    naming: 'buntui.[ext]',
    plugins: [vuePlugin],
    external: [
        '@buntui/compiler',
        '@buntui/compiler/vue-plugin',
        '@buntui/core',
        '@buntui/extensions',
        '@buntui/native',
        '@vue/reactivity',
        'commander',
    ],
});

if (!result.success) {
    for (const error of result.logs) console.error(error);
    process.exit(1);
}

for (const output of result.outputs) {
    const name = path.basename(output.path);
    console.log(`  ${name} (${(output.size / 1024).toFixed(1)} KB)`);
}

function getBinaryName(): string {
    const ext = process.platform === 'win32' ? 'dll' : process.platform === 'darwin' ? 'dylib' : 'so';
    const prefix = process.platform === 'win32' ? '' : 'lib';
    return `${prefix}buntui.${ext}`;
}

const nativeCandidates = [
    path.resolve(rootDir, '..', 'native', 'binaries', `${process.platform}-${process.arch}`),
    path.resolve(rootDir, '..', 'native', 'zig-out', 'bin'),
    path.resolve(rootDir, '..', 'native', 'zig-out', 'lib'),
    path.resolve(rootDir, '..', 'core', 'src', 'utils'),
];

const binaryName = getBinaryName();
for (const dir of nativeCandidates) {
    const candidate = path.join(dir, binaryName);
    if (fs.existsSync(candidate)) {
        const ext = binaryName.split('.').pop()!;
        const destName = `buntui.${ext}`;
        fs.copyFileSync(candidate, path.join(distDir, destName));
        console.log(`  ${destName} (copied)`);
        break;
    }
}
