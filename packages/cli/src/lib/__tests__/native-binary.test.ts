import {it, expect, describe, afterEach} from 'bun:test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {copyNativeBinary} from '../native-binary.ts';

describe('copyNativeBinary', () => {
  let tmpDir: string;
  let distDir: string;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, {recursive: true, force: true});
    }
  });

  function getExt(): string {
    if (process.platform === 'win32') return 'dll';
    if (process.platform === 'darwin') return 'dylib';
    return 'so';
  }

  function getBinaryName(): string {
    const prefix = process.platform === 'win32' ? '' : 'lib';
    return `${prefix}buntui.${getExt()}`;
  }

  it('copies binary from cwd root', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buntui-test-'));
    distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, {recursive: true});

    const binaryName = getBinaryName();
    const binaryContent = Buffer.from('fake-binary');
    fs.writeFileSync(path.join(tmpDir, binaryName), binaryContent);

    copyNativeBinary(distDir, tmpDir);

    const destName = `buntui.${getExt()}`;
    expect(fs.existsSync(path.join(distDir, destName))).toBe(true);
  });

  it('copies binary from node_modules/@buntui/core', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buntui-test-'));
    distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, {recursive: true});

    const coreDir = path.join(tmpDir, 'node_modules', '@buntui', 'core');
    fs.mkdirSync(coreDir, {recursive: true});

    const binaryName = getBinaryName();
    fs.writeFileSync(path.join(coreDir, binaryName), Buffer.from('fake-core-binary'));

    copyNativeBinary(distDir, tmpDir);

    const destName = `buntui.${getExt()}`;
    expect(fs.existsSync(path.join(distDir, destName))).toBe(true);
  });

  it('copies binary from node_modules/@buntui/core/src/utils', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buntui-test-'));
    distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, {recursive: true});

    const utilsDir = path.join(tmpDir, 'node_modules', '@buntui', 'core', 'src', 'utils');
    fs.mkdirSync(utilsDir, {recursive: true});

    const ext = getExt();
    fs.writeFileSync(path.join(utilsDir, `buntui.${ext}`), Buffer.from('fake-utils-binary'));

    copyNativeBinary(distDir, tmpDir);

    expect(fs.existsSync(path.join(distDir, `buntui.${ext}`))).toBe(true);
  });

  it('produces correctly named destination file', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buntui-test-'));
    distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, {recursive: true});

    const binaryName = getBinaryName();
    fs.writeFileSync(path.join(tmpDir, binaryName), Buffer.from('fake'));

    copyNativeBinary(distDir, tmpDir);

    const ext = getExt();
    const destPath = path.join(distDir, `buntui.${ext}`);
    expect(fs.existsSync(destPath)).toBe(true);
    expect(fs.statSync(destPath).size).toBeGreaterThan(0);
  });
});
