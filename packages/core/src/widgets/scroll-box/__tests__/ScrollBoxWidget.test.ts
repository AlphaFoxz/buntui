import {it, expect, describe} from 'bun:test';
import {createScrollBoxWidget} from '../ScrollBoxWidget';
import {ScrollBoxWidget} from '../ScrollBoxWidget';
import {createBox} from '../../box/BoxWidget';
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

function createScrollBox(options?: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  gap?: number;
  scrollSpeed?: number;
  alwaysShowScrollbar?: boolean;
}): ScrollBoxWidget {
  return new ScrollBoxWidget({
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 20,
    height: options?.height ?? 10,
    borderStyle: 'solid',
    borderTop: true,
    borderRight: true,
    borderBottom: true,
    borderLeft: true,
    gap: options?.gap ?? 0,
    scrollSpeed: options?.scrollSpeed ?? 3,
    alwaysShowScrollbar: options?.alwaysShowScrollbar ?? false,
  });
}

describe('construction', () => {
  it('initializes with default options', () => {
    const sb = createScrollBoxWidget();
    const r = sb.rect;
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.width).toBe(20);
    expect(r.height).toBe(10);
    expect(sb.scrollOffsetY).toBe(0);
    expect(sb.acceptsFocus).toBe(true);
  });

  it('initializes with custom options', () => {
    const sb = createScrollBox({x: 5, y: 3, width: 30, height: 15});
    const r = sb.rect;
    expect(r.x).toBe(5);
    expect(r.y).toBe(3);
    expect(r.width).toBe(30);
    expect(r.height).toBe(15);
  });
});

describe('child management', () => {
  it('addChild adds children', () => {
    const sb = createScrollBox();
    const child = createBox({height: 5});
    sb.addChild(child);
    expect(child.refrenceCount).toBe(1);
  });

  it('removeChild removes children', () => {
    const sb = createScrollBox();
    const child = createBox({height: 5});
    sb.addChild(child);
    sb.removeChild(child);
    expect(child.refrenceCount).toBe(0);
  });
});

describe('scroll offset', () => {
  it('clamps scrollOffsetY to valid range', () => {
    const sb = createScrollBox({height: 10});
    // With borders (2 rows), viewport height = 8. No children = 0 content height = 0 max scroll.
    sb.scrollTo(100);
    expect(sb.scrollOffsetY).toBe(0);
    sb.scrollTo(-5);
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('scrolls when content overflows viewport', () => {
    const sb = createScrollBox({height: 10}); // viewport = 8 rows (border takes 2)
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5})); // total = 25 content height
    }

    sb.scrollTo(17); // max = 25 - 8 = 17
    expect(sb.scrollOffsetY).toBe(17);

    sb.scrollTo(100);
    expect(sb.scrollOffsetY).toBe(17);
  });

  it('scrollToTop resets to 0', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.scrollToBottom();
    expect(sb.scrollOffsetY).toBeGreaterThan(0);
    sb.scrollToTop();
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('scrollToBottom sets to max offset', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.scrollToBottom();
    expect(sb.scrollOffsetY).toBe(sb.maxScrollY);
    expect(sb.scrollOffsetY).toBe(17);
  });

  it('scrollBy adds delta and clamps', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.scrollBy(5);
    expect(sb.scrollOffsetY).toBe(5);
    sb.scrollBy(-3);
    expect(sb.scrollOffsetY).toBe(2);
    sb.scrollBy(-100);
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('scrollBy with gap', () => {
    const sb = createScrollBox({height: 10, gap: 2});
    // 5 children * 5 height + 4 gaps * 2 = 33 content, viewport = 8, max = 25
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.scrollToBottom();
    expect(sb.scrollOffsetY).toBe(25);
  });
});

describe('keyboard scrolling', () => {
  it('ArrowDown scrolls by 1', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.handleKey(key({key: 'ArrowDown'}));
    expect(sb.scrollOffsetY).toBe(1);
  });

  it('ArrowUp scrolls back by 1', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.handleKey(key({key: 'ArrowDown'}));
    sb.handleKey(key({key: 'ArrowDown'}));
    sb.handleKey(key({key: 'ArrowUp'}));
    expect(sb.scrollOffsetY).toBe(1);
  });

  it('PageDown scrolls by viewport height', () => {
    const sb = createScrollBox({height: 10}); // viewport = 8
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.handleKey(key({key: 'PageDown'}));
    expect(sb.scrollOffsetY).toBe(8);
  });

  it('PageUp scrolls back by viewport height', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.handleKey(key({key: 'PageDown'}));
    sb.handleKey(key({key: 'PageUp'}));
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('Home scrolls to top', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.scrollToBottom();
    sb.handleKey(key({key: 'Home'}));
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('End scrolls to bottom', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.handleKey(key({key: 'End'}));
    expect(sb.scrollOffsetY).toBe(sb.maxScrollY);
  });

  it('ignores undefined key', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.handleKey({
      key: undefined,
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
      charCode: 0,
    });
    expect(sb.scrollOffsetY).toBe(0);
  });
});

describe('focus', () => {
  it('focus dispatches focus event', () => {
    const sb = createScrollBox();
    let focused = false;
    sb.on('focus', () => { focused = true; });
    sb.focus();
    expect(focused).toBe(true);
  });

  it('blur dispatches blur event', () => {
    const sb = createScrollBox();
    let blurred = false;
    sb.on('blur', () => { blurred = true; });
    sb.blur();
    expect(blurred).toBe(true);
  });
});

describe('rect and hit testing', () => {
  it('containsPoint checks bounds correctly', () => {
    const sb = createScrollBox({x: 5, y: 5, width: 20, height: 10});
    expect(sb.containsPoint(5, 5)).toBe(true);
    expect(sb.containsPoint(24, 5)).toBe(true);
    expect(sb.containsPoint(25, 5)).toBe(false);
    expect(sb.containsPoint(4, 5)).toBe(false);
    expect(sb.containsPoint(10, 14)).toBe(true);
    expect(sb.containsPoint(10, 15)).toBe(false);
  });

  it('updateRect updates position and propagates to inner Box', () => {
    const sb = createScrollBox({x: 0, y: 0});
    sb.updateRect({x: 10, y: 20});
    const r = sb.rect;
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
  });

  it('updateRect partially updates fields', () => {
    const sb = createScrollBox({x: 5, y: 10});
    sb.updateRect({x: 15});
    const r = sb.rect;
    expect(r.x).toBe(15);
    expect(r.y).toBe(10);
  });
});

describe('intrinsicSize', () => {
  it('returns undefined (requires explicit dimensions)', () => {
    const sb = createScrollBox();
    expect(sb.intrinsicSize()).toBeUndefined();
  });
});
