import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import {
  listApps, getDistDir, getPublicDir, getCwd,
} from '../lib/app-resolver.ts';
import {createVuePlugin} from '../lib/vue-plugin.ts';
import {copyNativeBinary} from '../lib/native-binary.ts';

function rewriteImports(content: string, originalPath: string, fileMap: Map<string, string>): string {
  const originalDir = path.dirname(originalPath);
  for (const [otherPath, otherName] of fileMap) {
    if (otherPath === originalPath) {
      continue;
    }

    const rel = path.relative(originalDir, otherPath).replaceAll('\\', '/');
    const escaped = rel.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
    content = content.replaceAll(
      new RegExp(String.raw`from\s*(["'])${escaped}\1`, 'gu'),
      `from $1./${otherName}$1`,
    );
    content = content.replaceAll(
      new RegExp(String.raw`import\s*\(\s*(["'])${escaped}\1\s*\)`, 'gu'),
      `import("./${otherName}")`,
    );
  }

  return content;
}

function copyPublicFiles(distDir: string, cwd: string): void {
  const publicDir = getPublicDir(cwd);
  if (!fs.existsSync(publicDir)) {
    return;
  }

  const distPublicDir = path.join(distDir, 'public');
  fs.mkdirSync(distPublicDir, {recursive: true});
  for (const file of fs.readdirSync(publicDir)) {
    const src = path.join(publicDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, path.join(distPublicDir, file));
      console.log(`  public/${file}`);
    }
  }
}

export async function buildCommand(): Promise<void> {
  const cwd = getCwd();
  const distDir = getDistDir(cwd);
  const apps = listApps(cwd);

  if (apps.length === 0) {
    console.error('No apps found in src/apps/');
    process.exit(1);
  }

  console.log(`Building ${apps.length} app(s): ${apps.map(a => a.name).join(', ')}\n`);

  fs.mkdirSync(distDir, {recursive: true});

  const entrypoints = apps.map(a => a.hasCustomMain ? a.mainPath : a.entryVue);
  const vuePlugin = createVuePlugin();

  const result = await Bun.build({
    entrypoints,
    outdir: distDir,
    target: 'bun',
    minify: true,
    splitting: apps.length > 1,
    naming: '[dir]/[name].[ext]',
    plugins: [vuePlugin],
  });

  if (!result.success) {
    for (const error of result.logs) {
      console.error(error);
    }

    process.exit(1);
  }

  const keepFiles = new Set<string>();

  if (apps.length > 1) {
    const fileMap = new Map<string, string>();
    let chunkIndex = 0;

    for (const output of result.outputs) {
      const relative = path.relative(distDir, output.path).replaceAll('\\', '/');
      const appMatch = /^(.+?)[\\/][^.]+\.js$/u.exec(relative);
      if (appMatch) {
        fileMap.set(output.path, `${appMatch[1]!}.js`);
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
      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, {recursive: true, force: true});
      }
    }

    const staleChunks = [...fileMap.keys()].filter(p => !path.relative(distDir, p).replaceAll('\\', '/').includes('/'));
    for (const p of staleChunks) {
      const newName = fileMap.get(p)!;
      if (path.basename(p) !== newName && fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }

    for (const [, newName] of fileMap) {
      console.log(`  ${newName} (${(fs.statSync(path.join(distDir, newName)).size / 1024).toFixed(1)} KB)`);
    }
  } else {
    for (const output of result.outputs) {
      const relative = path.relative(distDir, output.path).replaceAll('\\', '/');
      keepFiles.add(relative.split('/')[0]!);
      console.log(`  ${relative} (${(output.size / 1024).toFixed(1)} KB)`);
    }
  }

  keepFiles.add('public');
  copyPublicFiles(distDir, cwd);
  copyNativeBinary(distDir, cwd);

  for (const entry of fs.readdirSync(distDir)) {
    if (keepFiles.has(entry)) {
      continue;
    }

    const fullPath = path.join(distDir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      fs.rmSync(fullPath, {recursive: true, force: true});
    } else {
      fs.unlinkSync(fullPath);
    }
  }

  console.log('\n  Build complete!');
}
