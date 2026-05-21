import {it, expect, describe} from 'bun:test';
import {InteractiveWidget} from '../InteractiveWidget';
import type {KeyboardEvent} from '../../events/types';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';

class TestInteractive extends InteractiveWidget {
  handleActiveKeyCalls: KeyboardEvent[] = [];

  override emitDrawCommands(_buf: DrawListBuffer): void {}

  override handleActiveKey(event: KeyboardEvent): void {
    this.handleActiveKeyCalls.push(event);
  }
}

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

describe('focus / blur', () => {
  it('starts unfocused', () => {
    const widget = new TestInteractive();
    expect(widget.focused).toBe(false);
  });

  it('focus sets focused to true', () => {
    const widget = new TestInteractive();
    widget.focus();
    expect(widget.focused).toBe(true);
  });

  it('focus dispatches focus event', () => {
    const widget = new TestInteractive();
    let focused = false;
    widget.on('focus', () => { focused = true; });
    widget.focus();
    expect(focused).toBe(true);
  });

  it('blur sets focused to false', () => {
    const widget = new TestInteractive();
    widget.focus();
    widget.blur();
    expect(widget.focused).toBe(false);
  });

  it('blur dispatches blur event', () => {
    const widget = new TestInteractive();
    let blurred = false;
    widget.on('blur', () => { blurred = true; });
    widget.focus();
    widget.blur();
    expect(blurred).toBe(true);
  });
});

describe('acceptsFocus', () => {
  it('accepts focus when not disabled', () => {
    const widget = new TestInteractive();
    expect(widget.acceptsFocus).toBe(true);
  });

  it('rejects focus when disabled', () => {
    const widget = new TestInteractive();
    widget.setDisabled(true);
    expect(widget.acceptsFocus).toBe(false);
  });
});

describe('disabled state', () => {
  it('starts not disabled', () => {
    const widget = new TestInteractive();
    expect(widget.disabled).toBe(false);
  });

  it('setDisabled changes state', () => {
    const widget = new TestInteractive();
    widget.setDisabled(true);
    expect(widget.disabled).toBe(true);
    widget.setDisabled(false);
    expect(widget.disabled).toBe(false);
  });
});

describe('handleKey', () => {
  it('delegates to subclass implementation', () => {
    const widget = new TestInteractive();
    const event = key({key: 'Enter'});
    widget.handleKey(event);
    expect(widget.handleActiveKeyCalls).toHaveLength(1);
    expect(widget.handleActiveKeyCalls[0]).toBe(event);
  });
});

describe('key event dispatch', () => {
  it('dispatches key event from dispatchKeyEvent', () => {
    const widget = new TestInteractive();
    let received: KeyboardEvent | undefined;
    widget.on('key', (data: unknown) => { received = data as KeyboardEvent; });
    const event = key({key: 'Enter'});
    widget.handleKey(event);
    expect(received).toBeDefined();
    expect(received!.key).toBe('Enter');
  });

  it('dispatches key event bubbles to parent', () => {
    const parent = new TestInteractive();
    const child = new TestInteractive();
    parent.addChild(child);
    let parentReceived: KeyboardEvent | undefined;
    parent.on('key', (data: unknown) => { parentReceived = data as KeyboardEvent; });
    const event = key({key: 'Escape'});
    child.handleKey(event);
    expect(parentReceived).toBeDefined();
    expect(parentReceived!.key).toBe('Escape');
  });
});

describe('unmounted', () => {
  it('blurs when focused', () => {
    const widget = new TestInteractive();
    widget.focus();
    let blurred = false;
    widget.on('blur', () => { blurred = true; });
    widget.unmounted();
    expect(blurred).toBe(true);
    expect(widget.focused).toBe(false);
  });

  it('does not blur when not focused', () => {
    const widget = new TestInteractive();
    let blurred = false;
    widget.on('blur', () => { blurred = true; });
    widget.unmounted();
    expect(blurred).toBe(false);
  });

  it('calls super.unmounted to decrement referenceCount', () => {
    const widget = new TestInteractive();
    widget.mounted();
    widget.mounted();
    widget.unmounted();
    expect(widget.referenceCount).toBe(1);
  });
});
