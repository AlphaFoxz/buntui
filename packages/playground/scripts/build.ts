#!/usr/bin/env bun
import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import {compile, CORE_REGISTRY} from '@buntui/compiler';

const rootDir = path.join(import.meta.dir, '..');
const appsDir = path.join(rootDir, 'src', 'apps');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

const apps = fs.readdirSync(appsDir).filter(name => {
  return fs.statSync(path.join(appsDir, name)).isDirectory()
    && fs.existsSync(path.join(appsDir, name, 'main.ts'));
});

if (apps.length === 0) {
  console.error('No apps found in src/apps/');
  process.exit(1);
}

console.log(`Building ${apps.length} app(s): ${apps.join(', ')}\n`);

function getBinaryName(): string {
  const ext = process.platform === 'win32' ? 'dll' : process.platform === 'darwin' ? 'dylib' : 'so';
  const prefix = process.platform === 'win32' ? '' : 'lib';
  return `${prefix}buntui.${ext}`;
}

function findDll(): string | undefined {
  const binaryName = getBinaryName();
  const candidates = [
    path.resolve(import.meta.dir, '..', '..', 'native', 'binaries', `${process.platform}-${process.arch}`, `buntui.${binaryName.split('.').pop()}`),
    path.resolve(import.meta.dir, '..', '..', 'native', 'zig-out', 'bin', `buntui.${binaryName.split('.').pop()}`),
    path.resolve(import.meta.dir, '..', '..', 'native', 'zig-out', 'lib', binaryName),
    path.resolve(import.meta.dir, '..', binaryName),
  ];
  return candidates.find(c => fs.existsSync(c));
}

function rewriteImports(content: string, originalPath: string, fileMap: Map<string, string>): string {
  const originalDir = path.dirname(originalPath);
  for (const [otherPath, otherName] of fileMap) {
    if (otherPath === originalPath) continue;
    const rel = path.relative(originalDir, otherPath).replace(/\\/g, '/');
    const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    content = content.replace(
      new RegExp(`from\\s*(["'])${escaped}\\1`, 'g'),
      `from $1./${otherName}$1`,
    );
    content = content.replace(
      new RegExp(`import\\s*\\(\\s*(["'])${escaped}\\1\\s*\\)`, 'g'),
      `import("./${otherName}")`,
    );
  }
  return content;
}

const keepFiles = new Set<string>();

fs.mkdirSync(distDir, {recursive: true});

const entrypoints = apps.map(name => path.join('src', 'apps', name, 'main.ts'));

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

const result = await Bun.build({entrypoints, outdir: distDir, target: 'bun', minify: true, splitting: true, naming: '[dir]/[name].[ext]', plugins: [vuePlugin]});

if (!result.success) {
  for (const error of result.logs) console.error(error);
  process.exit(1);
}

const fileMap = new Map<string, string>();
let chunkIndex = 0;

for (const output of result.outputs) {
  const relative = path.relative(distDir, output.path).replace(/\\/g, '/');
  const appMatch = relative.match(/^(.+?)[\\/]main\.js$/);
  if (appMatch) {
    fileMap.set(output.path, `${appMatch[1]}.js`);
  } else if (relative.endsWith('.js')) {
    fileMap.set(output.path, chunkIndex === 0 ? '__common.js' : `__common-${chunkIndex}.js`);
    chunkIndex++;
  }
}

for (const [originalPath, newName] of fileMap) {
  const content = rewriteImports(fs.readFileSync(originalPath, 'utf-8'), originalPath, fileMap);
  fs.writeFileSync(path.join(distDir, newName), content);
  keepFiles.add(newName);
}

for (const entry of fs.readdirSync(distDir)) {
  const fullPath = path.join(distDir, entry);
  if (fs.statSync(fullPath).isDirectory()) fs.rmSync(fullPath, {recursive: true, force: true});
}

const staleChunks = [...fileMap.keys()].filter(p => !path.relative(distDir, p).replace(/\\/g, '/').includes('/'));
for (const p of staleChunks) {
  const newName = fileMap.get(p)!;
  if (path.basename(p) !== newName && fs.existsSync(p)) fs.unlinkSync(p);
}

for (const [, newName] of fileMap) {
  console.log(`  ${newName} (${(fs.statSync(path.join(distDir, newName)).size / 1024).toFixed(1)} KB)`);
}

if (fs.existsSync(publicDir)) {
  const distPublicDir = path.join(distDir, 'public');
  fs.mkdirSync(distPublicDir, {recursive: true});
  keepFiles.add('public');
  for (const file of fs.readdirSync(publicDir)) {
    const src = path.join(publicDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, path.join(distPublicDir, file));
      console.log(`  public/${file}`);
    }
  }
}

const dllSrc = findDll();
if (dllSrc) {
  const dllName = path.basename(dllSrc);
  fs.copyFileSync(dllSrc, path.join(distDir, dllName));
  console.log(`\n  ${dllName} (copied)`);
  keepFiles.add(dllName);
}

for (const entry of fs.readdirSync(distDir)) {
  if (keepFiles.has(entry)) continue;
  const fullPath = path.join(distDir, entry);
  fs.statSync(fullPath).isDirectory() ? fs.rmSync(fullPath, {recursive: true, force: true}) : fs.unlinkSync(fullPath);
}
