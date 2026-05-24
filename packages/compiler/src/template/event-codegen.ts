import type {TuiEventBinding} from './ast';

const KEY_MODIFIER_MAP: Record<string, string> = {
  enter: 'Enter',
  esc: 'Escape',
  escape: 'Escape',
  tab: 'Tab',
  space: ' ',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  delete: 'Delete',
  backspace: 'Backspace',
  insert: 'Insert',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  f1: 'F1',
  f2: 'F2',
  f3: 'F3',
  f4: 'F4',
  f5: 'F5',
  f6: 'F6',
  f7: 'F7',
  f8: 'F8',
  f9: 'F9',
  f10: 'F10',
  f11: 'F11',
  f12: 'F12',
  f13: 'F13',
  f14: 'F14',
  f15: 'F15',
  f16: 'F16',
  f17: 'F17',
  f18: 'F18',
  f19: 'F19',
  f20: 'F20',
};

const SYSTEM_MODIFIERS = new Set(['ctrl', 'shift', 'alt', 'meta']);

const IDENTIFIER_RE = /^[a-zA-Z_$][\w$]*$/v;

function isBareIdentifier(expr: string): boolean {
  return IDENTIFIER_RE.test(expr.trim());
}

function isArrowFunction(expr: string): boolean {
  return expr.trim().includes('=>');
}

export function buildEventHandler(eventBinding: TuiEventBinding): string {
  const {handler} = eventBinding;
  const needsWrapper = !isArrowFunction(handler) && !isBareIdentifier(handler);

  if (eventBinding.modifiers.length === 0) {
    return needsWrapper ? `($event) => { ${handler} }` : handler;
  }

  const guards: string[] = [];
  const prefixLines: string[] = [];

  for (const mod of eventBinding.modifiers) {
    if (mod === 'stop') {
      prefixLines.push('$event.stopPropagation();');
    } else if (mod === 'prevent') {
      continue;
    } else if (SYSTEM_MODIFIERS.has(mod)) {
      guards.push(`$event.${mod}Key`);
    } else if (KEY_MODIFIER_MAP[mod] === undefined) {
      guards.push(`$event.key === '${mod}'`);
    } else {
      guards.push(`$event.key === '${KEY_MODIFIER_MAP[mod]}'`);
    }
  }

  if (guards.length === 0 && prefixLines.length === 0 && !needsWrapper) {
    return handler;
  }

  const guardCheck = guards.length > 0 ? `if (${guards.join(' && ')}) ` : '';
  const prefix = prefixLines.join(' ');
  const body = isArrowFunction(handler)
    ? `${guardCheck}${handler}`
    : `${prefix} ${guardCheck}${handler}`;

  return `($event) => { ${body} }`;
}
