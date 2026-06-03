#!/usr/bin/env bun
import process from 'node:process';
import path from 'node:path';
import {Command} from 'commander';
import {devCommand} from './commands/dev.ts';
import {buildCommand} from './commands/build.ts';

const program = new Command();

program
  .name('buntui')
  .description('BunTUI framework CLI')
  .version('0.1.0-alpha.3')
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

program.parse();
