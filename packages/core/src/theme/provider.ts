import type {TuiTheme} from './types';
import {catppuccinMocha} from './themes';

export type ThemeChangeListener = (theme: TuiTheme) => void;

let currentTheme: TuiTheme = catppuccinMocha;
const listeners = new Set<ThemeChangeListener>();

export function getTheme(): TuiTheme {
  return currentTheme;
}

export function setTheme(theme: TuiTheme): void {
  currentTheme = theme;
  for (const listener of listeners) {
    listener(theme);
  }
}

export function onThemeChange(listener: ThemeChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
