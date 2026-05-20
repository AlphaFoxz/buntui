import {it, expect, describe} from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {suffix} from 'bun:ffi';

const ROOT = path.resolve(import.meta.dir, '..', '..', '..', '..', '..');
const PLATFORMS_DIR = path.join(ROOT, 'packages', 'native-platforms');
const NATIVE_DIR = path.join(ROOT, 'packages', 'native');

interface PlatformDef {
  dir: string;
  pkgName: string;
  binaryFile: string;
}

function getPlatformDefs(): PlatformDef[] {
  const platforms: PlatformDef[] = [];
  for (const dir of fs.readdirSync(PLATFORMS_DIR)) {
    const pkgJsonPath = path.join(PLATFORMS_DIR, dir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const indexTs = fs.readFileSync(path.join(PLATFORMS_DIR, dir, 'index.ts'), 'utf8');
    const binaryMatch = indexTs.match(/'([^']+\.(dll|so|dylib))'/);
    if (!binaryMatch) continue;
    platforms.push({
      dir,
      pkgName: pkg.name,
      binaryFile: binaryMatch[1],
    });
  }

  return platforms;
}

function getBuildScriptDllNames(): string[] {
  const paths = [
    path.join(ROOT, 'my-buntui-app', 'scripts', 'build.ts'),
    path.join(ROOT, 'packages', 'create-buntui', 'templates', 'basic', 'scripts', 'build.ts'),
  ];
  const names: string[] = [];
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    const match = src.match(/buntui\.\$\{getBinaryExt\(\)\}/);
    if (match) names.push('buntui.{ext}');
  }

  return names;
}

describe('native distribution consistency', () => {
  it('platform index.ts binary filename matches bun:ffi suffix convention', () => {
    const platforms = getPlatformDefs();
    const extMap: Record<string, string> = {
      win32: 'dll',
      linux: 'so',
      darwin: 'dylib',
    };
    for (const p of platforms) {
      const [os] = p.dir.split('-');
      const expectedExt = extMap[os];
      expect(expectedExt, `unknown os in platform dir: ${p.dir}`).toBeDefined();
      expect(p.binaryFile).toBe(`buntui.${expectedExt}`);
    }
  });

  it('platform package.json files field includes the binary', () => {
    const platforms = getPlatformDefs();
    for (const p of platforms) {
      const pkgJsonPath = path.join(PLATFORMS_DIR, p.dir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      expect(pkg.files, `${p.dir}: missing "files" field`).toContain(p.binaryFile);
    }
  });

  it('@buntui/native optionalDependencies covers all platform packages', () => {
    const platforms = getPlatformDefs();
    const nativePkg = JSON.parse(
      fs.readFileSync(path.join(NATIVE_DIR, 'package.json'), 'utf8'),
    );
    const optDeps = Object.keys(nativePkg.optionalDependencies ?? {});
    for (const p of platforms) {
      expect(optDeps, `missing optionalDependency: ${p.pkgName}`).toContain(p.pkgName);
    }
    const platformNames = new Set(platforms.map(p => p.pkgName));
    for (const dep of optDeps) {
      expect(platformNames.has(dep), `stale optionalDependency: ${dep}`).toBe(true);
    }
  });

  it('ffi.ts binaryName matches bun:ffi suffix', () => {
    const ffiSrc = fs.readFileSync(
      path.join(ROOT, 'packages', 'core', 'src', 'utils', 'ffi.ts'),
      'utf8',
    );
    const match = ffiSrc.match(/`buntui\.\$\{suffix\}`/);
    expect(match, 'ffi.ts binaryName should use `buntui.${suffix}`').not.toBeNull();
  });

  it('native/index.ts binaryName matches bun:ffi suffix', () => {
    const indexSrc = fs.readFileSync(path.join(NATIVE_DIR, 'src', 'index.ts'), 'utf8');
    const match = indexSrc.match(/`buntui\.\$\{suffix\}`/);
    expect(match, 'native/index.ts binaryName should use `buntui.${suffix}`').not.toBeNull();
  });

  it('build scripts produce filename that resolveNativeLibPath can find via Bun.main', () => {
    const ffiSrc = fs.readFileSync(
      path.join(ROOT, 'packages', 'core', 'src', 'utils', 'ffi.ts'),
      'utf8',
    );
    const runtimeNameMatch = ffiSrc.match(/`buntui\.\$\{suffix\}`/);
    expect(runtimeNameMatch).not.toBeNull();
    const buildNames = getBuildScriptDllNames();
    expect(buildNames.length, 'no build scripts found').toBeGreaterThan(0);
  });

  it('all platform packages export a binaryPath', () => {
    const platforms = getPlatformDefs();
    for (const p of platforms) {
      const indexSrc = fs.readFileSync(path.join(PLATFORMS_DIR, p.dir, 'index.ts'), 'utf8');
      expect(
        indexSrc.includes('export const binaryPath'),
        `${p.dir}: index.ts must export binaryPath`,
      ).toBe(true);
    }
  });

  it('create-buntui template package.json declares @buntui/native', () => {
    const templatePkgPath = path.join(
      ROOT,
      'packages',
      'create-buntui',
      'templates',
      'basic',
      'package.json',
    );
    if (!fs.existsSync(templatePkgPath)) return;
    const src = fs.readFileSync(templatePkgPath, 'utf8');
    const cleaned = src.replace(/\{\{name\}\}/g, 'test-app');
    const pkg = JSON.parse(cleaned);
    expect(
      pkg.dependencies?.['@buntui/native'],
      'template must declare @buntui/native dependency',
    ).toBeDefined();
  });

  it('create-buntui template build script imports @buntui/native', () => {
    const templateBuildPath = path.join(
      ROOT,
      'packages',
      'create-buntui',
      'templates',
      'basic',
      'scripts',
      'build.ts',
    );
    if (!fs.existsSync(templateBuildPath)) return;
    const src = fs.readFileSync(templateBuildPath, 'utf8');
    expect(
      src.includes("from '@buntui/native'"),
      'template build.ts must import getBinaryPath from @buntui/native',
    ).toBe(true);
  });

  it('my-buntui-app build script imports @buntui/native', () => {
    const buildPath = path.join(ROOT, 'my-buntui-app', 'scripts', 'build.ts');
    if (!fs.existsSync(buildPath)) return;
    const src = fs.readFileSync(buildPath, 'utf8');
    expect(
      src.includes("from '@buntui/native'"),
      'my-buntui-app build.ts must import getBinaryPath from @buntui/native',
    ).toBe(true);
  });

  it('my-buntui-app package.json declares @buntui/native', () => {
    const pkgPath = path.join(ROOT, 'my-buntui-app', 'package.json');
    if (!fs.existsSync(pkgPath)) return;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(
      pkg.dependencies?.['@buntui/native'],
      'my-buntui-app must declare @buntui/native dependency',
    ).toBeDefined();
  });
});
