#!/usr/bin/env bun
import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import {Command} from 'commander';
import {devCommand} from './commands/dev.ts';
import {buildCommand} from './commands/build.ts';
import {wasmDevCommand} from './commands/wasm-dev.ts';
import {wasmBuildCommand} from './commands/wasm-build.ts';

const {version} = JSON.parse(fs.readFileSync(path.join(import.meta.dir, '..', 'package.json'), 'utf-8')) as {version: string};

const program = new Command();

program
  .name('buntui')
  .description('BunTUI framework CLI')
  .version(version)
  .option('--cwd <dir>', 'set working directory', (value: string) => {
    process.chdir(path.resolve(value));
  });

program
  .command('dev')
  .description('start dev server with HMR')
  .argument('[app]', 'app name (auto-detected if only one exists)')
  .action(async (appName?: string) => {
    await devCommand(appName);
  });

program
  .command('build')
  .description('production build')
  .action(async () => {
    await buildCommand();
  });

const wasm = program
  .command('wasm')
  .description('WASM/browser target commands');

wasm
  .command('dev')
  .description('start WASM dev server (requires vite)')
  .argument('[app]', 'app name (auto-detected if only one exists)')
  .action(async (appName?: string) => {
    await wasmDevCommand(appName);
  });

wasm
  .command('build')
  .description('production build for browser target')
  .action(async () => {
    await wasmBuildCommand();
  });

program.parse();
