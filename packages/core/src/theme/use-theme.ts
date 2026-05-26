import type {TuiTheme} from './types';
import {getTheme} from './provider';

// NOTE: Placeholder for P3 SFC reactive binding (see roadmap P3: "编译器识别 useTheme() 响应式绑定").
// Currently an alias for getTheme(). Will be upgraded to a reactive API when SFC integration lands.
export function useTheme(): TuiTheme {
  return getTheme();
}
