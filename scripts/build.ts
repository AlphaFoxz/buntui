import {promises as fs} from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';

type PackageJson = {
  name: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const packagesDir = path.resolve(import.meta.dirname, '..', 'packages');

async function getPackages(): Promise<Record<string, PackageJson>> {
  const dirs = await fs.readdir(packagesDir);
  const pkgs: Record<string, PackageJson> = {};

  await Promise.all(dirs.map(async dir => {
    const pkgPath = path.join(packagesDir, dir, 'package.json');
    try {
      const content = await fs.readFile(pkgPath, 'utf-8');
      const json = JSON.parse(content) as PackageJson;
      pkgs[json.name] = json;
    } catch {
      // 跳过没有 package.json 的目录
    }
  }));

  return pkgs;
}

// 拓扑排序，保证依赖先构建
function topoSort(pkgs: Record<string, PackageJson>): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(name: string) {
    if (visited.has(name)) {
      return;
    }

    visited.add(name);

    const deps = {};
    if (pkgs[name]?.dependencies) {
      Object.assign(deps, pkgs[name].dependencies);
    }

    if (pkgs[name]?.devDependencies) {
      Object.assign(deps, pkgs[name].devDependencies);
    }

    for (const dep of Object.keys(deps)) {
      if (pkgs[dep]) {
        visit(dep);
      }
    }

    result.push(name);
  }

  for (const name of Object.keys(pkgs)) {
    visit(name);
  }

  return result;
}

async function main() {
  const pkgs = await getPackages();
  const order = topoSort(pkgs);

  console.log('📦 Build dependencies:', order.join(' -> '));

  for (const name of order) {
    console.log(`🚀 Building package \`${name}\`...`);
    const pkgDir = path.join(packagesDir, name.replace(/^@.+\//, '')); // 去掉作用域前缀
    execSync('bun run build', {cwd: pkgDir, stdio: 'inherit'});
  }

  console.log('✅ Build success!');
}

try {
  await main();
} catch (error: unknown) {
  let message = '🚨 Build failed!';
  if (['string', 'number', 'boolean', 'object'].includes(typeof error)) {
    message += String(error);
  }

  throw new Error(message); 
}
