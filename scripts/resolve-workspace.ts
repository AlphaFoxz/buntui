import path from 'node:path';
import fs from 'node:fs';

const rootDir = path.resolve(import.meta.dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

type PackageJson = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const versionMap = new Map<string, string>();

function collectVersions() {
  const dirs = fs.readdirSync(packagesDir);
  for (const dir of dirs) {
    const pkgJsonPath = path.join(packagesDir, dir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;
    const json: PackageJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    if (json.name && json.version) {
      versionMap.set(json.name, json.version);
    }
  }

  const platformsDir = path.join(packagesDir, 'native-platforms');
  for (const dir of fs.readdirSync(platformsDir)) {
    const pkgJsonPath = path.join(platformsDir, dir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;
    const json: PackageJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    if (json.name && json.version) {
      versionMap.set(json.name, json.version);
    }
  }
}

function replaceWorkspace(pkgJsonPath: string) {
  const content = fs.readFileSync(pkgJsonPath, 'utf-8');
  const json: PackageJson = JSON.parse(content);
  let changed = false;

  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const) {
    const deps = json[field];
    if (!deps) continue;
    for (const [name, version] of Object.entries(deps)) {
      if (version === 'workspace:*' || version.startsWith('workspace:')) {
        const resolved = versionMap.get(name);
        if (resolved) {
          deps[name] = `^${resolved}`;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(pkgJsonPath, JSON.stringify(json, null, 4) + '\n', 'utf-8');
    console.log(`  Updated: ${json.name}`);
  }
}

collectVersions();
console.log('Resolved versions:');
for (const [name, version] of versionMap) {
  console.log(`  ${name}@${version}`);
}

console.log('\nReplacing workspace:* references...');

const dirs = fs.readdirSync(packagesDir);
for (const dir of dirs) {
  const pkgJsonPath = path.join(packagesDir, dir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) continue;
  replaceWorkspace(pkgJsonPath);
}

const platformsDir = path.join(packagesDir, 'native-platforms');
for (const dir of fs.readdirSync(platformsDir)) {
  const pkgJsonPath = path.join(platformsDir, dir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) continue;
  replaceWorkspace(pkgJsonPath);
}

console.log('\nDone.');
