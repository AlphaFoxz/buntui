import type {TuiTheme} from './types';
import {catppuccinMocha} from './themes';

let currentTheme: TuiTheme = catppuccinMocha;

export function getTheme(): TuiTheme {
  return currentTheme;
}

export function setTheme(theme: TuiTheme): void {
  currentTheme = theme;
}
