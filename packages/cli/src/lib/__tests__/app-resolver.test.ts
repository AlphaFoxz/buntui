import {it, expect, describe, afterEach} from 'bun:test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {listApps, resolveApp, getAppsDir, getDistDir, getPublicDir, getDevDir} from '../app-resolver.ts';

function createTmpProject(structure: Record<string, string | null>): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buntui-test-'));
  const appsDir = path.join(tmpDir, 'src', 'apps');
  for (const [relPath, content] of Object.entries(structure)) {
    const fullPath = path.join(appsDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), {recursive: true});
    if (content !== null) {
      fs.writeFileSync(fullPath, content);
    }
  }

  return tmpDir;
}

describe('getAppsDir', () => {
  it('returns src/apps under cwd', () => {
    expect(getAppsDir('/project')).toBe(path.join('/project', 'src', 'apps'));
  });
});

describe('getDistDir', () => {
  it('returns dist under cwd', () => {
    expect(getDistDir('/project')).toBe(path.join('/project', 'dist'));
  });
});

describe('getPublicDir', () => {
  it('returns public under cwd', () => {
    expect(getPublicDir('/project')).toBe(path.join('/project', 'public'));
  });
});

describe('getDevDir', () => {
  it('returns src/.dev under cwd', () => {
    expect(getDevDir('/project')).toBe(path.join('/project', 'src', '.dev'));
  });
});

describe('listApps', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, {recursive: true, force: true});
    }
  });

  it('returns empty array when apps dir does not exist', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buntui-test-'));
    expect(listApps(tmpDir)).toEqual([]);
  });

  it('returns empty array when apps dir is empty', () => {
    tmpDir = createTmpProject({});
    expect(listApps(tmpDir)).toEqual([]);
  });

  it('discovers app with App.vue only', () => {
    tmpDir = createTmpProject({
      'demo/App.vue': '<template><Box /></template>',
    });
    const apps = listApps(tmpDir);
    expect(apps).toHaveLength(1);
    expect(apps[0]!.name).toBe('demo');
    expect(apps[0]!.hasCustomMain).toBe(false);
  });

  it('discovers app with main.ts only', () => {
    tmpDir = createTmpProject({
      'myapp/main.ts': 'console.log("hi")',
    });
    const apps = listApps(tmpDir);
    expect(apps).toHaveLength(1);
    expect(apps[0]!.name).toBe('myapp');
    expect(apps[0]!.hasCustomMain).toBe(true);
  });

  it('discovers app with both App.vue and main.ts', () => {
    tmpDir = createTmpProject({
      'full/App.vue': '<template><Box /></template>',
      'full/main.ts': 'console.log("hi")',
    });
    const apps = listApps(tmpDir);
    expect(apps).toHaveLength(1);
    expect(apps[0]!.name).toBe('full');
    expect(apps[0]!.hasCustomMain).toBe(true);
  });

  it('ignores directories without App.vue or main.ts', () => {
    tmpDir = createTmpProject({
      'empty/.gitkeep': '',
      'has-readme/README.md': '# hello',
    });
    expect(listApps(tmpDir)).toEqual([]);
  });

  it('ignores files directly in apps dir', () => {
    tmpDir = createTmpProject({
      'utils.ts': 'export const x = 1',
    });
    expect(listApps(tmpDir)).toEqual([]);
  });

  it('discovers multiple apps', () => {
    tmpDir = createTmpProject({
      'demo/App.vue': '<template><Box /></template>',
      'main/App.vue': '<template><Box /></template>',
      'extra/main.ts': 'console.log("hi")',
    });
    const apps = listApps(tmpDir);
    expect(apps).toHaveLength(3);
    expect(apps.map(a => a.name).sort()).toEqual(['demo', 'extra', 'main']);
  });
});

describe('resolveApp', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, {recursive: true, force: true});
    }
  });

  it('returns the single app when only one exists', () => {
    tmpDir = createTmpProject({
      'demo/App.vue': '<template><Box /></template>',
    });
    const app = resolveApp(undefined, tmpDir);
    expect(app.name).toBe('demo');
  });

  it('returns app by name', () => {
    tmpDir = createTmpProject({
      'demo/App.vue': '<template><Box /></template>',
      'admin/App.vue': '<template><Box /></template>',
    });
    const app = resolveApp('admin', tmpDir);
    expect(app.name).toBe('admin');
  });

  it('defaults to "main" app when multiple exist and no name given', () => {
    tmpDir = createTmpProject({
      'demo/App.vue': '<template><Box /></template>',
      'main/App.vue': '<template><Box /></template>',
    });
    const app = resolveApp(undefined, tmpDir);
    expect(app.name).toBe('main');
  });

  it('exits when no apps exist', () => {
    tmpDir = createTmpProject({});
    const originalExit = process.exit;
    let exitCode = 0;
    process.exit = ((code: number) => {
      exitCode = code;
    }) as never;
    try {
      resolveApp(undefined, tmpDir);
    } finally {
      process.exit = originalExit;
    }

    expect(exitCode).toBe(1);
  });

  it('exits when specified name not found', () => {
    tmpDir = createTmpProject({
      'demo/App.vue': '<template><Box /></template>',
    });
    const originalExit = process.exit;
    let exitCode = 0;
    process.exit = ((code: number) => {
      exitCode = code;
    }) as never;
    try {
      resolveApp('nonexistent', tmpDir);
    } finally {
      process.exit = originalExit;
    }

    expect(exitCode).toBe(1);
  });

  it('exits when multiple apps exist without "main" and no name given', () => {
    tmpDir = createTmpProject({
      'demo/App.vue': '<template><Box /></template>',
      'admin/App.vue': '<template><Box /></template>',
    });
    const originalExit = process.exit;
    let exitCode = 0;
    process.exit = ((code: number) => {
      exitCode = code;
    }) as never;
    try {
      resolveApp(undefined, tmpDir);
    } finally {
      process.exit = originalExit;
    }

    expect(exitCode).toBe(1);
  });
});
