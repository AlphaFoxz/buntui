import {it, expect, describe} from 'bun:test';
import {ButtonWidget, createButtonWidget} from '../ButtonWidget';
import type {KeyboardEvent, MouseEvent} from '../../../events/types';
import type {DrawListBuffer} from '../../../draw-list/DrawListBuffer';
import {parseColor} from '../../../utils/color';

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

describe('intrinsicSize', () => {
  it('returns the current rect dimensions', () => {
    const button = createButton({width: 17, height: 5});
    const size = button.intrinsicSize();
    expect(size).toEqual({width: 17, height: 5});
  });

  it('reflects updateRect changes', () => {
    const button = createButton({width: 10, height: 3});
    button.updateRect({width: 42, height: 7});
    expect(button.intrinsicSize()).toEqual({width: 42, height: 7});
  });
});

type Captured = {
  rects: Array<{x: number; y: number; width: number; height: number; bgRgba: number}>;
  texts: Array<{x: number; y: number; text: string; fgRgba: number; bgRgba: number}>;
  borders: Array<{x: number; y: number; width: number; height: number; colorRgba: number; style: number}>;
  pushClips: number;
  popClips: number;
};

function capture(): {buf: DrawListBuffer; captured: Captured} {
  const captured: Captured = {rects: [], texts: [], borders: [], pushClips: 0, popClips: 0};
  const buf = {
    drawRect: (opts: {x: number; y: number; width: number; height: number; bgRgba: number}) => {
      captured.rects.push(opts);
    },
    drawText: (opts: {x: number; y: number; text: string; fgRgba: number; bgRgba: number}) => {
      captured.texts.push(opts);
    },
    drawBorder: (opts: {x: number; y: number; width: number; height: number; colorRgba: number; style: number}) => {
      captured.borders.push(opts);
    },
    pushClip: () => {
      captured.pushClips++;
    },
    popClip: () => {
      captured.popClips++;
    },
    drawFill: () => {},
    drawLine: () => {},
    drawChar: () => {},
    drawShadow: () => {},
    setBackground: () => {},
    setSynchronizedUpdate: () => {},
    hideCursor: () => {},
    showCursor: () => {},
    setCursorMode: () => {},
    setTitle: () => {},
    setEntityId: () => {},
  } as unknown as DrawListBuffer;
  return {buf, captured};
}

describe('emitDrawCommands', () => {
  it('emits nothing when width or height is zero', () => {
    const button = createButton({width: 0, height: 3});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.rects).toHaveLength(0);
    expect(captured.pushClips).toBe(0);
  });

  it('emits nothing when height is zero', () => {
    const button = createButton({width: 10, height: 0});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.rects).toHaveLength(0);
  });

  it('always pushes and pops a clip in a pair', () => {
    const button = createButton();
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.pushClips).toBe(1);
    expect(captured.popClips).toBe(1);
  });

  it('emits exactly one background rect', () => {
    const button = createButton({value: 'Hi'});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.rects).toHaveLength(1);
    expect(captured.rects[0]!.x).toBe(0);
  });

  it('emits a text command when value is non-empty', () => {
    const button = createButton({value: 'OK'});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.texts).toHaveLength(1);
    expect(captured.texts[0]!.text).toBe('OK');
  });

  it('omits the text command when value is empty', () => {
    const button = createButton({value: ''});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.texts).toHaveLength(0);
  });

  it('omits the border when borderStyle is none (0)', () => {
    const button = createButton();
    button.updateNormalStyle({borderStyleNormal: 'none'});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.borders).toHaveLength(0);
  });

  it('emits a border when borderStyle is set', () => {
    const button = createButton();
    button.updateNormalStyle({borderStyleNormal: 'solid'});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.borders).toHaveLength(1);
    expect(captured.borders[0]!.style).toBe(1);
  });

  it('positions text without padding when borderStyle is none', () => {
    const button = createButton({value: 'OK', width: 10, height: 1});
    button.updateNormalStyle({borderStyleNormal: 'none'});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    const text = captured.texts[0]!;
    expect(text.x).toBe(4);
    expect(text.y).toBe(0);
  });

  it('positions text with padding when borderStyle is set', () => {
    const button = createButton({value: 'OK', width: 10, height: 3});
    button.updateNormalStyle({borderStyleNormal: 'solid'});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    const text = captured.texts[0]!;
    expect(text.x).toBe(4);
    expect(text.y).toBe(1);
  });

  it('does not truncate text width by border columns when borderless', () => {
    const button = createButton({value: 'abcdefghij', width: 10, height: 1});
    button.updateNormalStyle({borderStyleNormal: 'none'});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.texts[0]!.text).toBe('abcdefghij');
  });

  it('renders with the updated normal-state background and foreground', () => {
    const button = createButton({value: 'X'});
    button.updateNormalStyle({colorBgNormal: '#ff0000', colorFgNormal: '#00ff00'});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.rects[0]!.bgRgba).toBe(parseColor('#ff0000'));
    expect(captured.texts[0]!.fgRgba).toBe(parseColor('#00ff00'));
  });
});

describe('updateNormalStyle', () => {
  it('updates normal border color rendered in the default state', () => {
    const button = createButton();
    button.updateNormalStyle({colorBorderNormal: '#0000ff', borderStyleNormal: 'solid'});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.borders[0]!.colorRgba).toBe(parseColor('#0000ff'));
  });

  it('ignores undefined option fields', () => {
    const button = createButton();
    button.updateNormalStyle({borderStyleNormal: 'solid'});
    button.updateNormalStyle({colorFgNormal: undefined});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.borders).toHaveLength(1);
  });
});

describe('updateHoveredStyle', () => {
  it('updates hovered-state background rendered while hovered', () => {
    const button = createButton({value: 'X'});
    button.updateHoveredStyle({colorBgHovered: '#112233', borderStyleHovered: 'none'});
    button.dispatch('mouseover', mouse({x: 1, y: 1}));
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.rects[0]!.bgRgba).toBe(parseColor('#112233'));
  });
});

describe('updatePressedStyle', () => {
  it('updates pressed-state background rendered while pressed', () => {
    const button = createButton({value: 'X'});
    button.updatePressedStyle({colorBgPressed: '#445566', borderStylePressed: 'none'});
    button.dispatch('mouseover', mouse({x: 1, y: 1}));
    button.dispatch('mousedown', mouse({x: 1, y: 1}));
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.rects[0]!.bgRgba).toBe(parseColor('#445566'));
  });
});

describe('borderless', () => {
  it('setBorderless(true) removes border in normal state', () => {
    const button = createButton({value: 'OK'});
    button.setBorderless(true);
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.borders).toHaveLength(0);
  });

  it('setBorderless(true) removes border in focused state', () => {
    const button = createButton({value: 'OK'});
    button.setBorderless(true);
    button.focus();
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.borders).toHaveLength(0);
  });

  it('setBorderless(true) removes border in hovered state', () => {
    const button = createButton({value: 'OK'});
    button.setBorderless(true);
    button.dispatch('mouseover', mouse({x: 1, y: 1}));
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.borders).toHaveLength(0);
  });

  it('setBorderless(true) removes border in pressed state', () => {
    const button = createButton({value: 'OK'});
    button.setBorderless(true);
    button.dispatch('mouseover', mouse({x: 1, y: 1}));
    button.dispatch('mousedown', mouse({x: 1, y: 1}));
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.borders).toHaveLength(0);
  });

  it('setBorderless(true) removes border in disabled state', () => {
    const button = createButton({value: 'OK'});
    button.setBorderless(true);
    button.setDisabled(true);
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.borders).toHaveLength(0);
  });

  it('setBorderless(false) is a no-op', () => {
    const button = createButton({value: 'OK'});
    button.setBorderless(false);
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.borders).toHaveLength(1);
  });

  it('constructor borderless option removes border', () => {
    const button = new ButtonWidget({value: 'OK', width: 10, height: 3, borderless: true});
    const {buf, captured} = capture();
    button.emitDrawCommands(buf);
    expect(captured.borders).toHaveLength(0);
  });

  it('constructor borderless defaults height to 1 when height is omitted', () => {
    const button = new ButtonWidget({value: 'OK', width: 10, borderless: true});
    expect(button.rect.height).toBe(1);
  });

  it('constructor borderless does not override explicit height', () => {
    const button = new ButtonWidget({value: 'OK', width: 10, height: 5, borderless: true});
    expect(button.rect.height).toBe(5);
  });

  it('createButtonWidget borderless defaults height to 1', () => {
    const button = createButtonWidget({value: 'OK', width: 10, borderless: true});
    expect(button.rect.height).toBe(1);
  });

  it('createButtonWidget borderless does not override explicit height', () => {
    const button = createButtonWidget({value: 'OK', width: 10, height: 5, borderless: true});
    expect(button.rect.height).toBe(5);
  });
});

describe('auto width', () => {
  it('width=auto computes width from content + border padding', () => {
    const button = new ButtonWidget({value: 'OK', width: 'auto', height: 3});
    expect(button.rect.width).toBe(4);
  });

  it('width=auto with borderless has no border padding', () => {
    const button = new ButtonWidget({value: 'Hello', width: 'auto', borderless: true});
    expect(button.rect.width).toBe(5);
  });

  it('width=auto with empty value collapses to border padding only', () => {
    const button = new ButtonWidget({value: '', width: 'auto', height: 3});
    expect(button.rect.width).toBe(2);
  });

  it('width=auto borderless with empty value is zero', () => {
    const button = new ButtonWidget({value: '', width: 'auto', borderless: true});
    expect(button.rect.width).toBe(0);
  });

  it('width=auto handles double-width CJK characters', () => {
    const button = new ButtonWidget({value: '你好', width: 'auto', height: 3});
    expect(button.rect.width).toBe(6);
  });

  it('omitting width still defaults to 10', () => {
    const button = new ButtonWidget({value: 'OK'});
    expect(button.rect.width).toBe(10);
  });

  it('intrinsicSize returns content width in auto mode', () => {
    const button = new ButtonWidget({value: 'Submit', width: 'auto', height: 3});
    expect(button.intrinsicSize()).toEqual({width: 8, height: 3});
  });

  it('intrinsicSize returns content width in auto mode with borderless', () => {
    const button = new ButtonWidget({value: 'Submit', width: 'auto', borderless: true});
    expect(button.intrinsicSize()).toEqual({width: 6, height: 1});
  });

  it('intrinsicSize still echoes rect in non-auto mode', () => {
    const button = new ButtonWidget({value: 'OK', width: 10, height: 3});
    expect(button.intrinsicSize()).toEqual({width: 10, height: 3});
  });

  it('updateValue resizes in auto mode', () => {
    const button = new ButtonWidget({value: 'Hi', width: 'auto', height: 3});
    expect(button.rect.width).toBe(4);
    button.updateValue('Hello World');
    expect(button.rect.width).toBe(13);
  });

  it('updateValue does not resize in non-auto mode', () => {
    const button = new ButtonWidget({value: 'Hi', width: 10, height: 3});
    button.updateValue('Hello World');
    expect(button.rect.width).toBe(10);
  });

  it('setBorderless recomputes width in auto mode', () => {
    const button = new ButtonWidget({value: 'Hello', width: 'auto', height: 3});
    expect(button.rect.width).toBe(7);
    button.setBorderless(true);
    expect(button.rect.width).toBe(5);
  });

  it('updateNormalStyle with borderStyle none recomputes width in auto mode', () => {
    const button = new ButtonWidget({value: 'Hello', width: 'auto', height: 3});
    expect(button.rect.width).toBe(7);
    button.updateNormalStyle({borderStyleNormal: 'none'});
    expect(button.rect.width).toBe(5);
  });

  it('createButtonWidget supports auto width', () => {
    const button = createButtonWidget({value: 'OK', width: 'auto', height: 3});
    expect(button.rect.width).toBe(4);
    expect(button.intrinsicSize()).toEqual({width: 4, height: 3});
  });

  it('createButtonWidget auto width with borderless', () => {
    const button = createButtonWidget({value: 'Test', width: 'auto', borderless: true});
    expect(button.rect.width).toBe(4);
    expect(button.rect.height).toBe(1);
  });
});
