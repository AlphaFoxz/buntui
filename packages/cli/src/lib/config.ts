import path from 'node:path';
import fs from 'node:fs';
import type {LogLevel} from '@buntui/core';

export type {LogLevel} from '@buntui/core';

export type BuntuiConfig = {
  app?: {
    logLevel?: LogLevel;
    clearLog?: boolean;
    debugMode?: boolean;
    quitOnQ?: boolean;
    tickRate?: number;
    renderRate?: number;
  };
};

export function defineConfig(config: BuntuiConfig): BuntuiConfig {
  return config;
}

export async function loadConfig(cwd: string): Promise<BuntuiConfig> {
  const configPath = path.join(cwd, 'buntui.config.ts');

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const mod = await import(configPath) as {default?: BuntuiConfig};
    return mod.default ?? {};
  } catch {
    console.warn('Failed to load buntui.config.ts');
    return {};
  }
}
