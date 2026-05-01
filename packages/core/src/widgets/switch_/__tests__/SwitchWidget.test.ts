import {it, expect, describe} from 'bun:test';
import {SwitchWidget} from '../SwitchWidget';
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

function createSwitch(options?: {label?: string; checked?: boolean; disabled?: boolean; rectX?: number; rectY?: number; rectWidth?: number; rectHeight?: number}) {
  return new SwitchWidget({
    label: options?.label ?? '',
    checked: options?.checked ?? false,
    disabled: options?.disabled ?? false,
    rectX: options?.rectX ?? 0,
    rectY: options?.rectY ?? 0,
    rectWidth: options?.rectWidth ?? 12,
    rectHeight: options?.rectHeight ?? 1,
  });
}

describe('construction', () => {
  it('initializes with default options', () => {
    const sw = new SwitchWidget();
    expect(sw.checked).toBe(false);
    expect(sw.label).toBe('');
    expect(sw.disabled).toBe(false);
    expect(sw.acceptsFocus).toBe(true);
    const r = sw.rect;
    expect(r.rectWidth).toBe(12);
    expect(r.rectHeight).toBe(1);
  });

  it('initializes with custom options', () => {
    const sw = createSwitch({label: 'Dark mode', checked: true});
    expect(sw.label).toBe('Dark mode');
    expect(sw.checked).toBe(true);
  });

  it('initializes as disabled', () => {
    const sw = createSwitch({disabled: true});
    expect(sw.disabled).toBe(true);
    expect(sw.acceptsFocus).toBe(false);
  });

  it('initializes thumbOffset to match checked state', () => {
    const swOn = createSwitch({checked: true});
    expect(swOn.checked).toBe(true);
    const swOff = createSwitch({checked: false});
    expect(swOff.checked).toBe(false);
  });
});

describe('toggle via keyboard', () => {
  it('Space toggles checked state', () => {
    const sw = createSwitch();
    expect(sw.checked).toBe(false);
    sw.handleKey(key({key: ' '}));
    expect(sw.checked).toBe(true);
    sw.handleKey(key({key: ' '}));
    expect(sw.checked).toBe(false);
  });

  it('Enter toggles checked state', () => {
    const sw = createSwitch();
    sw.handleKey(key({key: 'Enter'}));
    expect(sw.checked).toBe(true);
  });

  it('toggle dispatches change event with checked value', () => {
    const sw = createSwitch();
    const changes: unknown[] = [];
    sw.on('change', data => changes.push(data));
    sw.handleKey(key({key: ' '}));
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, boolean>).checked).toBe(true);
    sw.handleKey(key({key: ' '}));
    expect(changes).toHaveLength(2);
    expect((changes[1] as Record<string, boolean>).checked).toBe(false);
  });

  it('other keys do nothing', () => {
    const sw = createSwitch();
    sw.handleKey(key({key: 'a'}));
    sw.handleKey(key({key: 'Tab'}));
    sw.handleKey(key({key: 'Escape'}));
    expect(sw.checked).toBe(false);
  });

  it('ignores undefined key', () => {
    const sw = createSwitch();
    sw.handleKey({key: undefined, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, charCode: 0});
    expect(sw.checked).toBe(false);
  });

  it('disabled widget ignores keyboard toggle', () => {
    const sw = createSwitch({disabled: true});
    sw.handleKey(key({key: ' '}));
    expect(sw.checked).toBe(false);
    sw.handleKey(key({key: 'Enter'}));
    expect(sw.checked).toBe(false);
  });
});

describe('toggle via click', () => {
  it('click toggles checked state', () => {
    const sw = createSwitch();
    sw.dispatch('click', undefined);
    expect(sw.checked).toBe(true);
    sw.dispatch('click', undefined);
    expect(sw.checked).toBe(false);
  });

  it('click dispatches change event', () => {
    const sw = createSwitch();
    const changes: unknown[] = [];
    sw.on('change', data => changes.push(data));
    sw.dispatch('click', undefined);
    expect(changes).toHaveLength(1);
    expect((changes[0] as Record<string, boolean>).checked).toBe(true);
  });

  it('disabled widget ignores click', () => {
    const sw = createSwitch({disabled: true});
    sw.dispatch('click', undefined);
    expect(sw.checked).toBe(false);
  });
});

describe('setChecked', () => {
  it('sets checked state directly', () => {
    const sw = createSwitch();
    expect(sw.checked).toBe(false);
    sw.setChecked(true);
    expect(sw.checked).toBe(true);
    sw.setChecked(false);
    expect(sw.checked).toBe(false);
  });

  it('does not dispatch change event', () => {
    const sw = createSwitch();
    const changes: unknown[] = [];
    sw.on('change', data => changes.push(data));
    sw.setChecked(true);
    expect(changes).toHaveLength(0);
  });
});

describe('label setter', () => {
  it('setLabel updates label', () => {
    const sw = createSwitch({label: 'Old'});
    expect(sw.label).toBe('Old');
    sw.setLabel('New');
    expect(sw.label).toBe('New');
  });

  it('updateText alias updates label', () => {
    const sw = createSwitch();
    sw.updateText('Updated');
    expect(sw.label).toBe('Updated');
  });
});

describe('disabled state', () => {
  it('setDisabled changes state', () => {
    const sw = createSwitch();
    expect(sw.acceptsFocus).toBe(true);
    sw.setDisabled(true);
    expect(sw.disabled).toBe(true);
    expect(sw.acceptsFocus).toBe(false);
    sw.setDisabled(false);
    expect(sw.acceptsFocus).toBe(true);
  });
});

describe('focus / blur', () => {
  it('focus dispatches focus event', () => {
    const sw = createSwitch();
    let focused = false;
    sw.on('focus', () => { focused = true; });
    sw.focus();
    expect(focused).toBe(true);
  });

  it('blur dispatches blur event', () => {
    const sw = createSwitch();
    let blurred = false;
    sw.on('blur', () => { blurred = true; });
    sw.blur();
    expect(blurred).toBe(true);
  });
});

describe('rect and hit testing', () => {
  it('containsPoint checks bounds correctly', () => {
    const sw = createSwitch({rectX: 5, rectY: 3, rectWidth: 12, rectHeight: 1});
    expect(sw.containsPoint(5, 3)).toBe(true);
    expect(sw.containsPoint(16, 3)).toBe(true);
    expect(sw.containsPoint(17, 3)).toBe(false);
    expect(sw.containsPoint(4, 3)).toBe(false);
    expect(sw.containsPoint(10, 4)).toBe(false);
  });

  it('updateRect updates position and size', () => {
    const sw = createSwitch();
    sw.updateRect({rectX: 10, rectY: 20, rectWidth: 30, rectHeight: 3});
    const r = sw.rect;
    expect(r.rectX).toBe(10);
    expect(r.rectY).toBe(20);
    expect(r.rectWidth).toBe(30);
    expect(r.rectHeight).toBe(3);
  });

  it('updateRect partially updates fields', () => {
    const sw = createSwitch({rectX: 5});
    sw.updateRect({rectX: 15});
    expect(sw.rect.rectX).toBe(15);
  });
});

describe('unmounted', () => {
  it('unmounted while focused calls blur', () => {
    const sw = createSwitch();
    let blurred = false;
    sw.on('blur', () => { blurred = true; });
    sw.focus();
    sw.unmounted();
    expect(blurred).toBe(true);
  });
});
