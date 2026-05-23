import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

const WINDOWS_RESERVED = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
]);

// eslint-disable-next-line require-unicode-regexp
const VALID_NPM_NAME = /^(@[a-z\d][-a-z\d]*\/)?[a-z\d][-a-z\d_]*$/;

export function validateProjectName(name: string, targetDir: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Project name is required';
  }

  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return String.raw`Project name must not contain "..", "/", or "\"`;
  }

  if (trimmed.startsWith('.') || trimmed.startsWith('-')) {
    return 'Project name must start with a letter or number';
  }

  if (!VALID_NPM_NAME.test(trimmed)) {
    return 'Project name must be a valid npm package name (lowercase, letters, digits, hyphens, underscores)';
  }

  const segments = trimmed.split('/');
  const baseName = segments.at(-1) ?? trimmed;
  if (process.platform === 'win32' && WINDOWS_RESERVED.has(baseName.toLowerCase())) {
    return `"${baseName}" is a reserved name on Windows`;
  }

  const outputDir = path.resolve(targetDir, trimmed);
  if (fs.existsSync(outputDir)) {
    return `Directory already exists: ${trimmed}`;
  }

  return undefined;
}
