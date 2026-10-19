import type {CursorModeName} from '../../draw-list/types';

export const CURSOR_MODE_CYCLE: CursorModeName[] = ['blinking-ibeam', 'blinking-block', 'blinking-underscore', 'ibeam', 'block', 'underscore'];

export function cycleCursorMode(mode: CursorModeName): CursorModeName {
  const idx = CURSOR_MODE_CYCLE.indexOf(mode);
  return CURSOR_MODE_CYCLE[(idx + 1) % CURSOR_MODE_CYCLE.length]!;
}
