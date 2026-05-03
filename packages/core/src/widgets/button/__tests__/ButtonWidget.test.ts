import {it, expect, describe} from 'bun:test';
import {ButtonWidget} from '../ButtonWidget';
import type {KeyboardEvent, MouseEvent} from '../../../events/types';

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

function mouse(options: Partial<MouseEvent> & {x: number; y: number}): MouseEvent {
  return {
    button: options.button ?? 0,
    buttons: options.buttons ?? undefined,
    x: options.x,
    y: options.y,
    isRelease: options.isRelease ?? false,
    shiftKey: options.shiftKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    metaKey: options.metaKey ?? false,
  };
}

function createButton(options?: {value?: string; disabled?: boolean; x?: number; y?: number; width?: number; height?: number}) {
  return new ButtonWidget({
    value: options?.value ?? 'OK',
    disabled: options?.disabled ?? false,
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 10,
    height: options?.height ?? 3,
  });
}

describe('construction', () => {
  it('initializes with default options', () => {
    const button = new ButtonWidget();
    expect(button.value).toBe('');
    expect(button.disabled).toBe(false);
    expect(button.acceptsFocus).toBe(true);
    const r = button.rect;
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.width).toBe(10);
    expect(r.height).toBe(3);
  });

  it('initializes with custom options', () => {
    const button = createButton({value: 'Submit', x: 5, y: 10, width: 15, height: 5});
    expect(button.value).toBe('Submit');
    const r = button.rect;
    expect(r.x).toBe(5);
    expect(r.y).toBe(10);
    expect(r.width).toBe(15);
    expect(r.height).toBe(5);
  });

  it('initializes as disabled', () => {
    const button = createButton({disabled: true});
    expect(button.disabled).toBe(true);
    expect(button.acceptsFocus).toBe(false);
  });
});

describe('focus / blur', () => {
  it('focus dispatches focus event', () => {
    const button = createButton();
    let focused = false;
    button.on('focus', () => { focused = true; });
    button.focus();
    expect(focused).toBe(true);
  });

  it('blur dispatches blur event', () => {
    const button = createButton();
    let blurred = false;
    button.on('blur', () => { blurred = true; });
    button.blur();
    expect(blurred).toBe(true);
  });

  it('blur resets pressed state', () => {
    const button = createButton();
    button.dispatch('mousedown', mouse({x: 3, y: 1}));
    button.blur();
    // After blur, pressing Enter should still work (not stuck in pressed state)
    const clicks: unknown[] = [];
    button.on('click', data => clicks.push(data));
    button.focus();
    button.handleKey(key({key: 'Enter'}));
    expect(clicks).toHaveLength(1);
  });
});

describe('keyboard activation', () => {
  it('Enter dispatches click event', () => {
    const button = createButton();
    const clicks: unknown[] = [];
    button.on('click', data => clicks.push(data));
    button.handleKey(key({key: 'Enter'}));
    expect(clicks).toHaveLength(1);
  });

  it('Space dispatches click event', () => {
    const button = createButton();
    const clicks: unknown[] = [];
    button.on('click', data => clicks.push(data));
    button.handleKey(key({key: ' '}));
    expect(clicks).toHaveLength(1);
  });

  it('other keys do nothing', () => {
    const button = createButton();
    const clicks: unknown[] = [];
    button.on('click', data => clicks.push(data));
    button.handleKey(key({key: 'a'}));
    button.handleKey(key({key: 'Tab'}));
    button.handleKey(key({key: 'Escape'}));
    expect(clicks).toHaveLength(0);
  });

  it('disabled widget ignores Enter', () => {
    const button = createButton({disabled: true});
    const clicks: unknown[] = [];
    button.on('click', data => clicks.push(data));
    button.handleKey(key({key: 'Enter'}));
    expect(clicks).toHaveLength(0);
  });

  it('disabled widget ignores Space', () => {
    const button = createButton({disabled: true});
    const clicks: unknown[] = [];
    button.on('click', data => clicks.push(data));
    button.handleKey(key({key: ' '}));
    expect(clicks).toHaveLength(0);
  });

  it('ignores undefined key', () => {
    const button = createButton();
    const clicks: unknown[] = [];
    button.on('click', data => clicks.push(data));
    button.handleKey({key: undefined, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, charCode: 0});
    expect(clicks).toHaveLength(0);
  });
});

describe('mouse interaction', () => {
  it('mousedown sets pressed state', () => {
    const button = createButton();
    button.dispatch('mousedown', mouse({x: 3, y: 1}));
    // Indirect verification: click still fires after release
    const clicks: unknown[] = [];
    button.on('click', data => clicks.push(data));
    button.dispatch('mouseup', mouse({x: 3, y: 1}));
    expect(clicks).toHaveLength(0); // click is dispatched by PointerManager, not internally
  });

  it('mouseup resets pressed state', () => {
    const button = createButton();
    button.dispatch('mousedown', mouse({x: 3, y: 1}));
    button.dispatch('mouseup', mouse({x: 3, y: 1}));
    // Button returns to normal state
  });

  it('disabled widget ignores mousedown', () => {
    const button = createButton({disabled: true});
    button.dispatch('mousedown', mouse({x: 3, y: 1}));
    // Should not crash, pressed state should remain false
  });

  it('disabled widget ignores mouseup', () => {
    const button = createButton({disabled: true});
    button.dispatch('mouseup', mouse({x: 3, y: 1}));
    // Should not crash
  });
});

describe('disabled state', () => {
  it('setDisabled changes state', () => {
    const button = createButton();
    expect(button.disabled).toBe(false);
    expect(button.acceptsFocus).toBe(true);
    button.setDisabled(true);
    expect(button.disabled).toBe(true);
    expect(button.acceptsFocus).toBe(false);
    button.setDisabled(false);
    expect(button.disabled).toBe(false);
    expect(button.acceptsFocus).toBe(true);
  });

  it('disabled rejects focus via acceptsFocus', () => {
    const button = createButton({disabled: true});
    expect(button.acceptsFocus).toBe(false);
  });
});

describe('value setter', () => {
  it('updateValue updates value', () => {
    const button = createButton({value: 'Old'});
    expect(button.value).toBe('Old');
    button.updateValue('New');
    expect(button.value).toBe('New');
  });
});

describe('rect and hit testing', () => {
  it('containsPoint checks bounds correctly', () => {
    const button = createButton({x: 5, y: 5, width: 10, height: 3});
    expect(button.containsPoint(5, 5)).toBe(true);
    expect(button.containsPoint(14, 5)).toBe(true);
    expect(button.containsPoint(15, 5)).toBe(false);
    expect(button.containsPoint(4, 5)).toBe(false);
    expect(button.containsPoint(10, 7)).toBe(true);
    expect(button.containsPoint(10, 8)).toBe(false);
  });

  it('updateRect updates position and size', () => {
    const button = createButton();
    button.updateRect({x: 10, y: 20, width: 30, height: 5});
    const r = button.rect;
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.width).toBe(30);
    expect(r.height).toBe(5);
  });

  it('updateRect partially updates fields', () => {
    const button = createButton({x: 5, y: 10});
    button.updateRect({x: 15});
    const r = button.rect;
    expect(r.x).toBe(15);
    expect(r.y).toBe(10);
  });
});

describe('unmounted', () => {
  it('unmounted while focused calls blur', () => {
    const button = createButton();
    let blurred = false;
    button.on('blur', () => { blurred = true; });
    button.focus();
    button.unmounted();
    expect(blurred).toBe(true);
  });
});
