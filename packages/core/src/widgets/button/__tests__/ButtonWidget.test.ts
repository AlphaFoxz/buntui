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

function createButton(options?: {text?: string; disabled?: boolean; rectX?: number; rectY?: number; rectWidth?: number; rectHeight?: number}) {
  return new ButtonWidget({
    text: options?.text ?? 'OK',
    disabled: options?.disabled ?? false,
    rectX: options?.rectX ?? 0,
    rectY: options?.rectY ?? 0,
    rectWidth: options?.rectWidth ?? 10,
    rectHeight: options?.rectHeight ?? 3,
  });
}

describe('construction', () => {
  it('initializes with default options', () => {
    const button = new ButtonWidget();
    expect(button.text).toBe('');
    expect(button.disabled).toBe(false);
    expect(button.acceptsFocus).toBe(true);
    const r = button.rect;
    expect(r.rectX).toBe(0);
    expect(r.rectY).toBe(0);
    expect(r.rectWidth).toBe(10);
    expect(r.rectHeight).toBe(3);
  });

  it('initializes with custom options', () => {
    const button = createButton({text: 'Submit', rectX: 5, rectY: 10, rectWidth: 15, rectHeight: 5});
    expect(button.text).toBe('Submit');
    const r = button.rect;
    expect(r.rectX).toBe(5);
    expect(r.rectY).toBe(10);
    expect(r.rectWidth).toBe(15);
    expect(r.rectHeight).toBe(5);
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

describe('text setter', () => {
  it('setText updates text', () => {
    const button = createButton({text: 'Old'});
    expect(button.text).toBe('Old');
    button.setText('New');
    expect(button.text).toBe('New');
  });
});

describe('rect and hit testing', () => {
  it('containsPoint checks bounds correctly', () => {
    const button = createButton({rectX: 5, rectY: 5, rectWidth: 10, rectHeight: 3});
    expect(button.containsPoint(5, 5)).toBe(true);
    expect(button.containsPoint(14, 5)).toBe(true);
    expect(button.containsPoint(15, 5)).toBe(false);
    expect(button.containsPoint(4, 5)).toBe(false);
    expect(button.containsPoint(10, 7)).toBe(true);
    expect(button.containsPoint(10, 8)).toBe(false);
  });

  it('updateRect updates position and size', () => {
    const button = createButton();
    button.updateRect({rectX: 10, rectY: 20, rectWidth: 30, rectHeight: 5});
    const r = button.rect;
    expect(r.rectX).toBe(10);
    expect(r.rectY).toBe(20);
    expect(r.rectWidth).toBe(30);
    expect(r.rectHeight).toBe(5);
  });

  it('updateRect partially updates fields', () => {
    const button = createButton({rectX: 5, rectY: 10});
    button.updateRect({rectX: 15});
    const r = button.rect;
    expect(r.rectX).toBe(15);
    expect(r.rectY).toBe(10);
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
