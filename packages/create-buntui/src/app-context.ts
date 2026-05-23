import type {createApp} from '@buntui/core';

type TuiApp = ReturnType<typeof createApp>;

let currentApp: TuiApp | undefined;
let defaultProjectName: string | undefined;

export function setApp(app: TuiApp): void {
  currentApp = app;
}

export function getApp(): TuiApp {
  if (!currentApp) {
    throw new Error('App not initialized');
  }

  return currentApp;
}

export function setDefaultProjectName(name: string | undefined): void {
  defaultProjectName = name;
}

export function getDefaultProjectName(): string | undefined {
  return defaultProjectName;
}
