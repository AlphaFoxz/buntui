import {describe, it, expect, beforeEach, afterEach} from 'bun:test';
import path from 'node:path';
import fs from 'node:fs';
import {
  discoverVueFiles,
  findVueImportPath,
  replaceImportPath,
  cleanupStaleTemporaryFiles,
  VUE_IMPORT_RE,
} from '../dev-server';

const TMP = path.join(import.meta.dir, '__tmp_dev_server__');

function mkdirp(dir: string) {
  fs.mkdirSync(dir, {recursive: true});
}

function writeFile(filePath: string, content: string) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

function rmrf(dir: string) {
  fs.rmSync(dir, {recursive: true, force: true});
}

describe('VUE_IMPORT_RE', () => {
  it('matches single-quote vue imports', () => {
    const code = `import Child from './Child.vue'`;
    const matches = [...code.matchAll(VUE_IMPORT_RE)];
    expect(matches).toHaveLength(1);
    expect(matches[0]![1]).toBe('./Child.vue');
  });

  it('matches double-quote vue imports', () => {
    const code = `import Child from "./Child.vue"`;
    const matches = [...code.matchAll(VUE_IMPORT_RE)];
    expect(matches).toHaveLength(1);
    expect(matches[0]![1]).toBe('./Child.vue');
  });

  it('matches multiple imports', () => {
    const code = `import A from './A.vue'\nimport B from './B.vue'`;
    const matches = [...code.matchAll(VUE_IMPORT_RE)];
    expect(matches).toHaveLength(2);
  });

  it('does not match non-vue imports', () => {
    const code = `import {ref} from '@vue/reactivity'`;
    const matches = [...code.matchAll(VUE_IMPORT_RE)];
    expect(matches).toHaveLength(0);
  });
});

describe('discoverVueFiles', () => {
  beforeEach(() => {
    rmrf(TMP);
    mkdirp(TMP);
  });

  afterEach(() => {
    rmrf(TMP);
  });

  it('returns single file with no imports', () => {
    const entry = path.join(TMP, 'App.vue');
    writeFile(entry, '<template><Box/></template>');
    const files = discoverVueFiles(entry);
    expect(files).toEqual([entry]);
  });

  it('follows import chain', () => {
    const app = path.join(TMP, 'App.vue');
    const child = path.join(TMP, 'Child.vue');
    writeFile(app, `<template><Child/></template>\n<script setup>import Child from './Child.vue'</script>`);
    writeFile(child, '<template><Box/></template>');
    const files = discoverVueFiles(app);
    expect(files).toHaveLength(2);
    expect(files).toContain(app);
    expect(files).toContain(child);
  });

  it('handles circular imports without infinite loop', () => {
    const a = path.join(TMP, 'A.vue');
    const b = path.join(TMP, 'B.vue');
    writeFile(a, `import B from './B.vue'`);
    writeFile(b, `import A from './A.vue'`);
    const files = discoverVueFiles(a);
    expect(files).toHaveLength(2);
  });

  it('includes resolved path even when file is unreadable', () => {
    const entry = path.join(TMP, 'App.vue');
    writeFile(entry, `import Missing from './Missing.vue'`);
    const files = discoverVueFiles(entry);
    expect(files).toContain(entry);
    expect(files).toContain(path.join(TMP, 'Missing.vue'));
  });

  it('resolves relative paths from each file directory', () => {
    mkdirp(path.join(TMP, 'sub'));
    const app = path.join(TMP, 'App.vue');
    const child = path.join(TMP, 'sub', 'Child.vue');
    writeFile(app, `import Child from './sub/Child.vue'`);
    writeFile(child, '<template><Box/></template>');
    const files = discoverVueFiles(app);
    expect(files).toContain(child);
  });
});

describe('findVueImportPath', () => {
  it('finds matching import path', () => {
    const baseDir = path.join(TMP, 'project');
    const importRelative = './components/Child.vue';
    const resolved = path.resolve(baseDir, importRelative);
    const code = `import Child from '${importRelative}'`;
    expect(findVueImportPath(code, resolved, baseDir)).toBe(importRelative);
  });

  it('returns undefined when no match', () => {
    const baseDir = path.join(TMP, 'project');
    const code = `import Child from './Other.vue'`;
    expect(findVueImportPath(code, path.join(baseDir, 'Child.vue'), baseDir)).toBeUndefined();
  });

  it('handles empty code', () => {
    expect(findVueImportPath('', path.join(TMP, 'Child.vue'), TMP)).toBeUndefined();
  });
});

describe('replaceImportPath', () => {
  it('replaces single-quoted path', () => {
    const code = `import Child from './Child.vue'`;
    expect(replaceImportPath(code, './Child.vue', './_hmr_c_0.ts')).toBe(
      `import Child from './_hmr_c_0.ts'`,
    );
  });

  it('replaces double-quoted path', () => {
    const code = `import Child from "./Child.vue"`;
    expect(replaceImportPath(code, './Child.vue', './_hmr_c_0.ts')).toBe(
      `import Child from "./_hmr_c_0.ts"`,
    );
  });

  it('normalizes backslashes to forward slashes', () => {
    const code = `import Child from './Child.vue'`;
    expect(replaceImportPath(code, './Child.vue', '.\\_hmr_c_0.ts')).toBe(
      `import Child from './_hmr_c_0.ts'`,
    );
  });

  it('replaces multiple occurrences', () => {
    const code = `import Child from './Child.vue'\nimport Child2 from './Child.vue'`;
    expect(replaceImportPath(code, './Child.vue', './temp.ts')).toBe(
      `import Child from './temp.ts'\nimport Child2 from './temp.ts'`,
    );
  });
});

describe('cleanupStaleTemporaryFiles', () => {
  beforeEach(() => {
    rmrf(TMP);
    mkdirp(TMP);
  });

  afterEach(() => {
    rmrf(TMP);
  });

  it('removes _hmr_*.ts files', () => {
    const stale = path.join(TMP, '_hmr_c_0.ts');
    const keep = path.join(TMP, 'App.vue');
    writeFile(stale, '');
    writeFile(keep, '');
    cleanupStaleTemporaryFiles(TMP);
    expect(fs.existsSync(stale)).toBe(false);
    expect(fs.existsSync(keep)).toBe(true);
  });

  it('handles non-existent directory gracefully', () => {
    expect(() => cleanupStaleTemporaryFiles(path.join(TMP, 'nonexistent'))).not.toThrow();
  });

  it('removes root temp files with _hmr_ prefix', () => {
    const root = path.join(TMP, '_hmr_42.ts');
    writeFile(root, '');
    cleanupStaleTemporaryFiles(TMP);
    expect(fs.existsSync(root)).toBe(false);
  });
});
