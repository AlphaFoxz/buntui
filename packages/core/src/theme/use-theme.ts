import type {TuiTheme} from './types';
import {getTheme} from './provider';

export function useTheme(): TuiTheme {
  return getTheme();
}
