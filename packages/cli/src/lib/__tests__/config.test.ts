import {it, expect, describe, afterEach} from 'bun:test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {defineConfig, loadConfig} from '../config.ts';

describe('defineConfig', () => {
  it('returns the config object as-is', () => {
    const config = {app: {logLevel: 'info' as const, tickRate: 30}};
    expect(defineConfig(config)).toBe(config);
  });

  it('returns empty object for empty config', () => {
    expect(defineConfig({})).toEqual({});
  });

  it('returns config with partial app options', () => {
    const config = defineConfig({app: {debugMode: true}});
    expect(config.app?.debugMode).toBe(true);
    expect(config.app?.tickRate).toBeUndefined();
  });
});

describe('loadConfig', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, {recursive: true, force: true});
    }
  });

  it('returns empty object when no config file exists', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buntui-test-'));
    const result = await loadConfig(tmpDir);
    expect(result).toEqual({});
  });

  it('loads and returns default export from buntui.config.ts', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buntui-test-'));
    fs.writeFileSync(
      path.join(tmpDir, 'buntui.config.ts'),
      `import {defineConfig} from '${path.resolve(import.meta.dir, '..', 'config.ts').replaceAll('\\', '/')}';\nexport default defineConfig({app: {logLevel: 'info', tickRate: 30}});`,
    );
    const result = await loadConfig(tmpDir);
    expect(result.app?.logLevel).toBe('info');
    expect(result.app?.tickRate).toBe(30);
  });

  it('returns empty object when config has no default export', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buntui-test-'));
    fs.writeFileSync(
      path.join(tmpDir, 'buntui.config.ts'),
      'export const foo = 1;',
    );
    const result = await loadConfig(tmpDir);
    expect(result).toEqual({});
  });

  it('returns empty object when config has syntax error', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buntui-test-'));
    fs.writeFileSync(
      path.join(tmpDir, 'buntui.config.ts'),
      'export default {this is not valid syntax!!!',
    );
    const result = await loadConfig(tmpDir);
    expect(result).toEqual({});
  });
});
