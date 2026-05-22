import {it, expect, describe} from 'bun:test';
import {CheckboxWidget} from '../CheckboxWidget';
import type {KeyboardEvent} from '../../../events/types';

function key(options: Partial<KeyboardEvent> & {key: string}): KeyboardEvent {
  return {
    key: options.key,
    shiftKey: options.shiftKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    metaKey: options.metaKey ?? false,
    repeat: options.repeat ?? false,
    charCode: options.charCode ?? 0,
  };
}

function createCheckbox(options?: {label?: string; checked?: boolean; indeterminate?: boolean; disabled?: boolean; x?: number; y?: number; width?: number; height?: number}) {
  return new CheckboxWidget({
    label: options?.label ?? 'Option',
    checked: options?.checked ?? false,
    indeterminate: options?.indeterminate ?? false,
    disabled: options?.disabled ?? false,
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 15,
    height: options?.height ?? 1,
  });
}

describe('construction', () => {
  it('initializes with default options', () => {
    const cb = new CheckboxWidget();
    expect(cb.checked).toBe(false);
    expect(cb.label).toBe('');
    expect(cb.disabled).toBe(false);
    expect(cb.acceptsFocus).toBe(true);
    const r = cb.rect;
    expect(r.width).toBe(10);
    expect(r.height).toBe(1);
  });

  it('initializes with custom options', () => {
    const cb = createCheckbox({label: 'Enable dark mode', checked: true});
    expect(cb.label).toBe('Enable dark mode');
    expect(cb.checked).toBe(true);
  });

  it('initializes as disabled', () => {
    const cb = createCheckbox({disabled: true});
    expect(cb.disabled).toBe(true);
    expect(cb.acceptsFocus).toBe(false);
  });
});

describe('checked toggle via keyboard', () => {
  it('Space toggles checked state', () => {
    const cb = createCheckbox();
    expect(cb.checked).toBe(false);
    cb.handleKey(key({key: ' '}));
    expect(cb.checked).toBe(true);
    cb.handleKey(key({key: ' '}));
    expect(cb.checked).toBe(false);
  });

  it('Enter toggles checked state', () => {
    const cb = createCheckbox();
    cb.handleKey(key({key: 'Enter'}));
    expect(cb.checked).toBe(true);
  });

  it('toggle dispatches change event with checked value', () => {
    const cb = createCheckbox();
    const changes: unknown[] = [];
    cb.on('change', data => changes.push(data));
    cb.handleKey(key({key: ' '}));
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, boolean>).checked).toBe(true);
    cb.handleKey(key({key: ' '}));
    expect(changes).toHaveLength(2);
    expect((changes[1] as Record<string, boolean>).checked).toBe(false);
  });

  it('other keys do nothing', () => {
    const cb = createCheckbox();
    cb.handleKey(key({key: 'a'}));
    cb.handleKey(key({key: 'Tab'}));
    cb.handleKey(key({key: 'Escape'}));
    expect(cb.checked).toBe(false);
  });

  it('ignores undefined key', () => {
    const cb = createCheckbox();
    cb.handleKey({key: undefined, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, charCode: 0});
    expect(cb.checked).toBe(false);
  });

  it('disabled widget ignores keyboard toggle', () => {
    const cb = createCheckbox({disabled: true});
    cb.handleKey(key({key: ' '}));
    expect(cb.checked).toBe(false);
    cb.handleKey(key({key: 'Enter'}));
    expect(cb.checked).toBe(false);
  });
});

describe('checked toggle via click', () => {
  it('click toggles checked state', () => {
    const cb = createCheckbox();
    cb.dispatch('click', undefined);
    expect(cb.checked).toBe(true);
    cb.dispatch('click', undefined);
    expect(cb.checked).toBe(false);
  });

  it('click dispatches change event', () => {
    const cb = createCheckbox();
    const changes: unknown[] = [];
    cb.on('change', data => changes.push(data));
    cb.dispatch('click', undefined);
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, boolean>).checked).toBe(true);
  });

  it('disabled widget ignores click', () => {
    const cb = createCheckbox({disabled: true});
    cb.dispatch('click', undefined);
    expect(cb.checked).toBe(false);
  });
});

describe('setChecked', () => {
  it('sets checked state directly', () => {
    const cb = createCheckbox();
    expect(cb.checked).toBe(false);
    cb.setChecked(true);
    expect(cb.checked).toBe(true);
    cb.setChecked(false);
    expect(cb.checked).toBe(false);
  });

  it('does not dispatch change event', () => {
    const cb = createCheckbox();
    const changes: unknown[] = [];
    cb.on('change', data => changes.push(data));
    cb.setChecked(true);
    expect(changes).toHaveLength(0);
  });
});

describe('label setter', () => {
  it('setLabel updates label', () => {
    const cb = createCheckbox({label: 'Old'});
    expect(cb.label).toBe('Old');
    cb.setLabel('New');
    expect(cb.label).toBe('New');
  });
});

describe('disabled state', () => {
  it('setDisabled changes state', () => {
    const cb = createCheckbox();
    expect(cb.acceptsFocus).toBe(true);
    cb.setDisabled(true);
    expect(cb.disabled).toBe(true);
    expect(cb.acceptsFocus).toBe(false);
    cb.setDisabled(false);
    expect(cb.acceptsFocus).toBe(true);
  });
});

describe('focus / blur', () => {
  it('focus dispatches focus event', () => {
    const cb = createCheckbox();
    let focused = false;
    cb.on('focus', () => { focused = true; });
    cb.focus();
    expect(focused).toBe(true);
  });

  it('blur dispatches blur event', () => {
    const cb = createCheckbox();
    let blurred = false;
    cb.on('blur', () => { blurred = true; });
    cb.blur();
    expect(blurred).toBe(true);
  });
});

describe('rect and hit testing', () => {
  it('containsPoint checks bounds correctly', () => {
    const cb = createCheckbox({x: 5, y: 3, width: 15, height: 1});
    expect(cb.containsPoint(5, 3)).toBe(true);
    expect(cb.containsPoint(19, 3)).toBe(true);
    expect(cb.containsPoint(20, 3)).toBe(false);
    expect(cb.containsPoint(4, 3)).toBe(false);
    expect(cb.containsPoint(10, 4)).toBe(false);
  });

  it('updateRect updates position and size', () => {
    const cb = createCheckbox();
    cb.updateRect({x: 10, y: 20, width: 30, height: 3});
    const r = cb.rect;
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.width).toBe(30);
    expect(r.height).toBe(3);
  });

  it('updateRect partially updates fields', () => {
    const cb = createCheckbox({x: 5});
    cb.updateRect({x: 15});
    expect(cb.rect.x).toBe(15);
  });
});

describe('unmounted', () => {
  it('unmounted while focused calls blur', () => {
    const cb = createCheckbox();
    let blurred = false;
    cb.on('blur', () => { blurred = true; });
    cb.focus();
    cb.unmounted();
    expect(blurred).toBe(true);
  });
});

describe('indeterminate state', () => {
  it('defaults to not indeterminate', () => {
    const cb = createCheckbox();
    expect(cb.indeterminate).toBe(false);
  });

  it('can be set via constructor', () => {
    const cb = createCheckbox({indeterminate: true});
    expect(cb.indeterminate).toBe(true);
  });

  it('indeterminate with checked false', () => {
    const cb = createCheckbox({checked: false, indeterminate: true});
    expect(cb.indeterminate).toBe(true);
    expect(cb.checked).toBe(false);
  });

  it('toggle from indeterminate goes to checked true', () => {
    const cb = createCheckbox({indeterminate: true});
    cb.dispatch('click', undefined);
    expect(cb.indeterminate).toBe(false);
    expect(cb.checked).toBe(true);
  });

  it('toggle from indeterminate via keyboard', () => {
    const cb = createCheckbox({indeterminate: true});
    cb.handleKey(key({key: ' '}));
    expect(cb.indeterminate).toBe(false);
    expect(cb.checked).toBe(true);
  });

  it('toggle dispatches change with indeterminate field', () => {
    const cb = createCheckbox({indeterminate: true});
    const changes: unknown[] = [];
    cb.on('change', data => changes.push(data));
    cb.dispatch('click', undefined);
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, unknown>).checked).toBe(true);
    expect((changes[0] as Record<string, unknown>).indeterminate).toBe(false);
  });

  it('normal toggle also dispatches indeterminate field', () => {
    const cb = createCheckbox({checked: false});
    const changes: unknown[] = [];
    cb.on('change', data => changes.push(data));
    cb.dispatch('click', undefined);
    expect((changes[0] as Record<string, unknown>).indeterminate).toBe(false);
  });

  it('setChecked does not clear indeterminate', () => {
    const cb = createCheckbox({indeterminate: true});
    cb.setChecked(true);
    expect(cb.indeterminate).toBe(true);
    expect(cb.checked).toBe(true);
  });

  it('setIndeterminate toggles state', () => {
    const cb = createCheckbox();
    expect(cb.indeterminate).toBe(false);
    cb.setIndeterminate(true);
    expect(cb.indeterminate).toBe(true);
    cb.setIndeterminate(false);
    expect(cb.indeterminate).toBe(false);
  });

  it('setIndeterminate does not change checked', () => {
    const cb = createCheckbox({checked: true});
    cb.setIndeterminate(true);
    expect(cb.checked).toBe(true);
    expect(cb.indeterminate).toBe(true);
  });

  it('full cycle: indeterminate -> checked -> unchecked', () => {
    const cb = createCheckbox({indeterminate: true});
    cb.dispatch('click', undefined);
    expect(cb.checked).toBe(true);
    expect(cb.indeterminate).toBe(false);
    cb.dispatch('click', undefined);
    expect(cb.checked).toBe(false);
    expect(cb.indeterminate).toBe(false);
  });
});
