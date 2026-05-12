import path from 'node:path';
import fs from 'node:fs';

const rootDir = path.resolve(import.meta.dirname, '..');
const packagesDir = path.resolve(rootDir, 'packages');

type PackageJson = {
  name: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function syncDir(baseDir: string, rootVersion: string) {
  const dirs = fs.readdirSync(baseDir);
  for (const dir of dirs) {
    const pkgJsonPath = path.join(baseDir, dir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;
    const content = fs.readFileSync(pkgJsonPath, 'utf-8');
    const json = JSON.parse(content) as PackageJson;
    json.version = rootVersion;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(json, null, 4) + '\n', 'utf-8');
  }
}

function run() {
  const rootPackage = fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8');
  const rootPackageJson = JSON.parse(rootPackage) as PackageJson;
  const rootVersion = rootPackageJson.version ?? '0.0.0';

  syncDir(packagesDir, rootVersion);
  syncDir(path.join(packagesDir, 'native-platforms'), rootVersion);
}

run();
