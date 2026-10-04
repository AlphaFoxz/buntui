import {it, expect, describe} from 'bun:test';
import {createScrollBoxWidget} from '../ScrollBoxWidget';
import {ScrollBoxWidget} from '../ScrollBoxWidget';
import {createBox} from '../../box/BoxWidget';
import {createTextWidget} from '../../text/TextWidget';
import {DrawListBuffer} from '../../../draw-list/DrawListBuffer';
import {BorderSides} from '../../../draw-list/types';
import {TuiScene} from '../../../extern/app/TuiScene';
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
    x: options.x,
    y: options.y,
    button: options.button,
    buttons: options.buttons,
    isRelease: options.isRelease ?? false,
    shiftKey: options.shiftKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    metaKey: options.metaKey ?? false,
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
    expect(child.referenceCount).toBe(1);
  });

  it('removeChild removes children', () => {
    const sb = createScrollBox();
    const child = createBox({height: 5});
    sb.addChild(child);
    sb.removeChild(child);
    expect(child.referenceCount).toBe(0);
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

  it('re-clamps offset when content shrinks after swapping children', () => {
    // viewport height = 8 (10 - 2 border rows).
    const sb = createScrollBox({height: 10});
    const tall = createBox({height: 20});
    sb.addChild(tall);
    // content height 20 → maxScroll = 12
    sb.scrollTo(12);
    expect(sb.scrollOffsetY).toBe(12);

    // Swap to a shorter view (mirrors v-if view switching via removeChild/addChild).
    sb.removeChild(tall);
    const short = createBox({height: 3});
    sb.addChild(short);

    // Trigger the lazy relayout that runs at the top of emitDrawCommands.
    const buf = new DrawListBuffer();
    sb.emitDrawCommands(buf);

    // maxScroll is now max(0, 3 - 8) = 0, so the stale offset must be pulled back
    // to 0 instead of pushing the new content off-viewport (blank space bug).
    expect(sb.scrollOffsetY).toBe(0);
    // Content must remain inside the viewport rather than being culled above it.
    expect(short.rect.y).toBeGreaterThanOrEqual(1);
  });
});

describe('scroll event', () => {
  it('dispatches scroll event on scrollTo', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    const events: Array<{scrollOffsetY: number; maxScrollY: number}> = [];
    sb.on('scroll', data => events.push(data as typeof events[number]));
    sb.scrollTo(5);
    expect(events).toHaveLength(1);
    expect(events[0]!.scrollOffsetY).toBe(5);
    expect(events[0]!.maxScrollY).toBe(sb.maxScrollY);
  });

  it('does not dispatch when offset does not change', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    const events: unknown[] = [];
    sb.on('scroll', data => events.push(data));
    sb.scrollTo(0);
    expect(events).toHaveLength(0);
  });

  it('dispatches on wheel scroll', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    const events: unknown[] = [];
    sb.on('scroll', data => events.push(data));
    sb.dispatch('wheel', {wheelDeltaY: 1, x: 5, y: 5, button: 0, buttons: 0, isRelease: false, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false});
    expect(events).toHaveLength(1);
  });

  it('dispatches on drag scroll', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    sb.scrollTo(5);
    const events: unknown[] = [];
    sb.on('scroll', data => events.push(data));
    sb.dispatch('mousedown', mouse({x: 4, y: 4, button: 0}));
    sb.dispatch('mousemove', mouse({x: 4, y: 7, buttons: 1}));
    expect(events.length).toBeGreaterThan(0);
  });
});

describe('scrollTo / scrollBy', () => {
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

describe('scrollIntoView', () => {
  it('scrolls down to make child visible', () => {
    const sb = createScrollBox({height: 10});
    const children: ReturnType<typeof createBox>[] = [];
    for (let i = 0; i < 5; i++) {
      const child = createBox({height: 5});
      sb.addChild(child);
      children.push(child);
    }

    expect(sb.scrollOffsetY).toBe(0);
    sb.scrollIntoView(children[4]!);
    expect(sb.scrollOffsetY).toBeGreaterThan(0);
  });

  it('scrolls up to make child visible', () => {
    const sb = createScrollBox({height: 10});
    const children: ReturnType<typeof createBox>[] = [];
    for (let i = 0; i < 5; i++) {
      const child = createBox({height: 5});
      sb.addChild(child);
      children.push(child);
    }

    sb.scrollToBottom();
    const prevOffset = sb.scrollOffsetY;
    sb.scrollIntoView(children[0]!);
    expect(sb.scrollOffsetY).toBeLessThan(prevOffset);
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('does nothing if child is already visible', () => {
    const sb = createScrollBox({height: 10});
    const children: ReturnType<typeof createBox>[] = [];
    for (let i = 0; i < 5; i++) {
      const child = createBox({height: 5});
      sb.addChild(child);
      children.push(child);
    }

    sb.scrollIntoView(children[0]!);
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('does nothing if child is not a direct child', () => {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    const orphan = createBox({height: 5});
    sb.scrollIntoView(orphan);
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('works with gap', () => {
    const sb = createScrollBox({height: 10, gap: 2});
    const children: ReturnType<typeof createBox>[] = [];
    for (let i = 0; i < 5; i++) {
      const child = createBox({height: 5});
      sb.addChild(child);
      children.push(child);
    }

    sb.scrollIntoView(children[3]!);
    expect(sb.scrollOffsetY).toBeGreaterThan(0);
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

describe('focus border', () => {
  function countBorders(buffer: ArrayBuffer, byteLength: number): number {
    const view = new DataView(buffer);
    let cursor = 8;
    let count = 0;
    while (cursor < byteLength) {
      const cmdType = view.getUint16(cursor, true);
      const payloadLen = view.getUint32(cursor + 4, true);
      cursor += 8;
      if (cmdType === 0x12) {
        count++;
      }

      cursor += payloadLen;
    }

    return count;
  }

  function getBorderColors(buffer: ArrayBuffer, byteLength: number): number[] {
    const view = new DataView(buffer);
    let cursor = 8;
    const colors: number[] = [];
    while (cursor < byteLength) {
      const cmdType = view.getUint16(cursor, true);
      const payloadLen = view.getUint32(cursor + 4, true);
      cursor += 8;
      if (cmdType === 0x12) {
        colors.push(view.getUint32(cursor + 8, true));
      }

      cursor += payloadLen;
    }

    return colors;
  }

  function getBorderSides(buffer: ArrayBuffer, byteLength: number): number[] {
    const view = new DataView(buffer);
    let cursor = 8;
    const sides: number[] = [];
    while (cursor < byteLength) {
      const cmdType = view.getUint16(cursor, true);
      const payloadLen = view.getUint32(cursor + 4, true);
      cursor += 8;
      if (cmdType === 0x12) {
        sides.push(view.getUint8(cursor + 13));
      }

      cursor += payloadLen;
    }

    return sides;
  }

  it('renders focus border overlay when focused', () => {
    const sb = createScrollBox();
    sb.focus();
    const buf = new DrawListBuffer();
    buf.reset();
    sb.emitDrawCommands(buf);
    expect(countBorders(buf.buffer, buf.byteLength)).toBe(2);
  });

  it('does not render focus border when not focused', () => {
    const sb = createScrollBox();
    const buf = new DrawListBuffer();
    buf.reset();
    sb.emitDrawCommands(buf);
    expect(countBorders(buf.buffer, buf.byteLength)).toBe(1);
  });

  it('does not render focus border when disabled', () => {
    const sb = createScrollBox();
    sb.setDisabled(true);
    sb.focus();
    const buf = new DrawListBuffer();
    buf.reset();
    sb.emitDrawCommands(buf);
    expect(countBorders(buf.buffer, buf.byteLength)).toBe(1);
  });

  it('focus border uses a different color than normal border', () => {
    const sb = createScrollBox();
    sb.focus();
    const buf = new DrawListBuffer();
    buf.reset();
    sb.emitDrawCommands(buf);
    const colors = getBorderColors(buf.buffer, buf.byteLength);
    expect(colors).toHaveLength(2);
    expect(colors[1]).not.toBe(colors[0]);
  });

  it('respects per-side border config (top + bottom only)', () => {
    const sb = new ScrollBoxWidget({
      x: 0, y: 0, width: 20, height: 10,
      borderStyle: 'solid',
      borderTop: true,
      borderRight: false,
      borderBottom: true,
      borderLeft: false,
    });
    sb.focus();
    const buf = new DrawListBuffer();
    buf.reset();
    sb.emitDrawCommands(buf);
    const sides = getBorderSides(buf.buffer, buf.byteLength);
    expect(sides).toHaveLength(2);
    expect(sides[0]).toBe(BorderSides.Top | BorderSides.Bottom);
    expect(sides[1]).toBe(BorderSides.Top | BorderSides.Bottom);
  });

  it('does not render focus border when no border sides are enabled', () => {
    const sb = new ScrollBoxWidget({
      x: 0, y: 0, width: 20, height: 10,
      borderStyle: 'solid',
      borderTop: false,
      borderRight: false,
      borderBottom: false,
      borderLeft: false,
    });
    sb.focus();
    const buf = new DrawListBuffer();
    buf.reset();
    sb.emitDrawCommands(buf);
    const sides = getBorderSides(buf.buffer, buf.byteLength);
    expect(sides).toHaveLength(1);
    expect(sides[0]).toBe(0);
  });

  it('does not render focus border when borderStyleFocused is none', () => {
    const sb = new ScrollBoxWidget({
      x: 0, y: 0, width: 20, height: 10,
      borderStyle: 'solid',
      borderStyleFocused: 'none',
      borderTop: true,
      borderRight: true,
      borderBottom: true,
      borderLeft: true,
    });
    sb.focus();
    const buf = new DrawListBuffer();
    buf.reset();
    sb.emitDrawCommands(buf);
    expect(countBorders(buf.buffer, buf.byteLength)).toBe(1);
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

describe('drag scroll', () => {
  function createScrollable(): ScrollBoxWidget {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    return sb;
  }

  it('dragging down decreases offset (natural scroll)', () => {
    const sb = createScrollable();
    sb.scrollTo(5);
    sb.dispatch('mousedown', mouse({x: 4, y: 4, button: 0}));
    sb.dispatch('mousemove', mouse({x: 4, y: 7, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(2);
  });

  it('dragging up increases offset (natural scroll)', () => {
    const sb = createScrollable();
    sb.scrollTo(5);
    sb.dispatch('mousedown', mouse({x: 4, y: 7, button: 0}));
    sb.dispatch('mousemove', mouse({x: 4, y: 4, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(8);
  });

  it('mouseup stops drag scrolling', () => {
    const sb = createScrollable();
    sb.dispatch('mousedown', mouse({x: 4, y: 4, button: 0}));
    sb.dispatch('mouseup', mouse({x: 4, y: 4, button: 0, isRelease: true}));
    sb.dispatch('mousemove', mouse({x: 4, y: 9, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('mousemove without buttons stops drag scrolling', () => {
    const sb = createScrollable();
    sb.dispatch('mousedown', mouse({x: 4, y: 4, button: 0}));
    sb.dispatch('mousemove', mouse({x: 4, y: 9, buttons: 0}));
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('clamps drag scroll to valid range', () => {
    const sb = createScrollable();
    sb.scrollTo(5);
    sb.dispatch('mousedown', mouse({x: 4, y: 49, button: 0}));
    sb.dispatch('mousemove', mouse({x: 4, y: 4, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(sb.maxScrollY);
  });

  it('does not scroll on mousemove without prior mousedown', () => {
    const sb = createScrollable();
    sb.dispatch('mousemove', mouse({x: 4, y: 9, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(0);
  });
});

describe('scrollbar thumb drag', () => {
  // Geometry (0-based): viewport y=1, height=8, scrollbarX=19
  // thumbSize=3, scrollableRange=5, maxScroll=17
  function createScrollable(): ScrollBoxWidget {
    const sb = createScrollBox({height: 10});
    for (let i = 0; i < 5; i++) {
      sb.addChild(createBox({height: 5}));
    }

    return sb;
  }

  it('dragging thumb down scrolls proportionally', () => {
    const sb = createScrollable();
    sb.dispatch('mousedown', mouse({x: 19, y: 1, button: 0}));
    sb.dispatch('mousemove', mouse({x: 19, y: 6, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(17);
  });

  it('dragging thumb partially scrolls partially', () => {
    const sb = createScrollable();
    sb.dispatch('mousedown', mouse({x: 19, y: 1, button: 0}));
    sb.dispatch('mousemove', mouse({x: 19, y: 3, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(7);
  });

  it('mouseup stops thumb dragging', () => {
    const sb = createScrollable();
    sb.dispatch('mousedown', mouse({x: 19, y: 1, button: 0}));
    sb.dispatch('mouseup', mouse({x: 19, y: 1, button: 0, isRelease: true}));
    sb.dispatch('mousemove', mouse({x: 19, y: 6, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('mousemove without buttons stops thumb dragging', () => {
    const sb = createScrollable();
    sb.dispatch('mousedown', mouse({x: 19, y: 1, button: 0}));
    sb.dispatch('mousemove', mouse({x: 19, y: 6, buttons: 0}));
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('clicking track above thumb scrolls page up', () => {
    const sb = createScrollable();
    sb.scrollTo(10);
    sb.dispatch('mousedown', mouse({x: 19, y: 1, button: 0}));
    expect(sb.scrollOffsetY).toBe(10 - 8);
  });

  it('clicking track below thumb scrolls page down', () => {
    const sb = createScrollable();
    sb.dispatch('mousedown', mouse({x: 19, y: 5, button: 0}));
    expect(sb.scrollOffsetY).toBe(8);
  });

  it('clicking on content area does not trigger thumb drag', () => {
    const sb = createScrollable();
    sb.scrollTo(5);
    sb.dispatch('mousedown', mouse({x: 4, y: 1, button: 0}));
    sb.dispatch('mousemove', mouse({x: 4, y: 6, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('thumb drag clamps to valid range', () => {
    const sb = createScrollable();
    sb.dispatch('mousedown', mouse({x: 19, y: 1, button: 0}));
    sb.dispatch('mousemove', mouse({x: 19, y: 49, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(sb.maxScrollY);
  });

  it('thumb drag does not scroll when content fits viewport', () => {
    const sb = createScrollBox({height: 10});
    sb.addChild(createBox({height: 5}));
    sb.dispatch('mousedown', mouse({x: 19, y: 1, button: 0}));
    sb.dispatch('mousemove', mouse({x: 19, y: 6, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(0);
  });
});

describe('horizontal scroll', () => {
  // Geometry: ScrollBox width=20, height=10, borders all on.
  // Viewport: x=1, y=1, width=18, height=8.
  // Vertical scrollbar (when visible): col 19, rows 1-8.
  // Horizontal scrollbar (when visible): row 9, cols 1-18.
  function createWideScrollBox(options?: {
    width?: number;
    height?: number;
    childCount?: number;
    childWidth?: number;
    gap?: number;
    alwaysShowScrollbar?: boolean;
  }): ScrollBoxWidget {
    const sb = new ScrollBoxWidget({
      x: 0,
      y: 0,
      width: options?.width ?? 20,
      height: options?.height ?? 10,
      borderStyle: 'solid',
      borderTop: true,
      borderRight: true,
      borderBottom: true,
      borderLeft: true,
      gap: options?.gap ?? 0,
      scrollSpeed: 3,
      alwaysShowScrollbar: options?.alwaysShowScrollbar ?? false,
    });
    const count = options?.childCount ?? 1;
    const childWidth = options?.childWidth ?? 30;
    for (let i = 0; i < count; i++) {
      sb.addChild(createTextWidget('x'.repeat(childWidth)));
    }

    return sb;
  }

  describe('accessors', () => {
    it('initializes scrollOffsetX at 0', () => {
      const sb = createWideScrollBox();
      expect(sb.scrollOffsetX).toBe(0);
    });

    it('computes maxScrollX from widest child', () => {
      // childWidth=30, viewport width=18 → contentWidth=30, maxScrollX=12
      const sb = createWideScrollBox({childWidth: 30});
      expect(sb.maxScrollX).toBe(12);
    });

    it('maxScrollX is 0 when content fits viewport', () => {
      // childWidth=10, viewport width=18 → contentWidth=18, maxScrollX=0
      const sb = createWideScrollBox({childWidth: 10});
      expect(sb.maxScrollX).toBe(0);
    });

    it('maxScrollX uses the widest of multiple children', () => {
      const sb = createScrollBox({width: 20, height: 10});
      sb.addChild(createTextWidget('x'.repeat(20))); // intrinsic width 20
      sb.addChild(createTextWidget('x'.repeat(40))); // intrinsic width 40
      // viewport width = 18, contentWidth = max(18, 20, 40) = 40, maxScrollX = 22
      expect(sb.maxScrollX).toBe(22);
    });
  });

  describe('scrollToX / scrollByX', () => {
    it('scrollToX clamps to valid range', () => {
      const sb = createWideScrollBox({childWidth: 30}); // maxScrollX = 12
      sb.scrollToX(100);
      expect(sb.scrollOffsetX).toBe(12);
      sb.scrollToX(-5);
      expect(sb.scrollOffsetX).toBe(0);
    });

    it('scrollByX adds delta and clamps', () => {
      const sb = createWideScrollBox({childWidth: 30}); // maxScrollX = 12
      sb.scrollByX(5);
      expect(sb.scrollOffsetX).toBe(5);
      sb.scrollByX(-3);
      expect(sb.scrollOffsetX).toBe(2);
      sb.scrollByX(-100);
      expect(sb.scrollOffsetX).toBe(0);
    });

    it('scrollToLeft / scrollToRight', () => {
      const sb = createWideScrollBox({childWidth: 30}); // maxScrollX = 12
      sb.scrollToRight();
      expect(sb.scrollOffsetX).toBe(12);
      expect(sb.scrollOffsetX).toBe(sb.maxScrollX);
      sb.scrollToLeft();
      expect(sb.scrollOffsetX).toBe(0);
    });
  });

  describe('scroll event', () => {
    it('dispatches scroll event with X payload on scrollToX', () => {
      const sb = createWideScrollBox({childWidth: 30});
      const events: Array<{scrollOffsetX: number; maxScrollX: number; scrollOffsetY: number; maxScrollY: number}> = [];
      sb.on('scroll', data => events.push(data as typeof events[number]));
      sb.scrollToX(5);
      expect(events).toHaveLength(1);
      expect(events[0]!.scrollOffsetX).toBe(5);
      expect(events[0]!.maxScrollX).toBe(sb.maxScrollX);
      // Y payload preserved
      expect(events[0]!.scrollOffsetY).toBe(0);
      expect(events[0]!.maxScrollY).toBe(sb.maxScrollY);
    });

    it('does not dispatch when X offset does not change', () => {
      const sb = createWideScrollBox({childWidth: 30});
      const events: unknown[] = [];
      sb.on('scroll', data => events.push(data));
      sb.scrollToX(0);
      expect(events).toHaveLength(0);
    });

    it('preserves Y payload on Y-axis scroll', () => {
      // Both axes scrollable: many wide children. Text intrinsic height=1, need >8 for Y scroll.
      const sb = createWideScrollBox({childCount: 10, childWidth: 30});
      const events: Array<{scrollOffsetX: number; maxScrollX: number; scrollOffsetY: number; maxScrollY: number}> = [];
      sb.on('scroll', data => events.push(data as typeof events[number]));
      sb.scrollTo(2);
      expect(events).toHaveLength(1);
      expect(events[0]!.scrollOffsetY).toBe(2);
      expect(events[0]!.scrollOffsetX).toBe(0);
      expect(events[0]!.maxScrollX).toBe(sb.maxScrollX);
    });
  });

  describe('layout', () => {
    it('respects intrinsic width when wider than viewport', () => {
      const sb = createScrollBox({width: 20, height: 10}); // viewport width=18
      const wide = createTextWidget('x'.repeat(30)); // intrinsic width=30
      sb.addChild(wide);
      const buf = new DrawListBuffer();
      sb.emitDrawCommands(buf);
      // Layout forces children to contentWidth=30, x=viewport.x=1
      expect(wide.rect.width).toBe(30);
      expect(wide.rect.x).toBe(1);
    });

    it('fills viewport width when content fits', () => {
      const sb = createScrollBox({width: 20, height: 10}); // viewport width=18
      const narrow = createTextWidget('short'); // intrinsic width=5
      sb.addChild(narrow);
      const buf = new DrawListBuffer();
      sb.emitDrawCommands(buf);
      // Content not wider than viewport → child stretched to viewport width=18
      expect(narrow.rect.width).toBe(18);
    });

    it('respects explicit (percent) width even when content is wider than viewport', () => {
      const sb = createScrollBox({width: 20, height: 10}); // viewport width=18
      const box = createBox({width: '100%', height: 3}); // explicit 100% width
      box.addChild(createTextWidget('x'.repeat(30))); // intrinsic width 30 > viewport
      sb.addChild(box);
      const buf = new DrawListBuffer();
      sb.emitDrawCommands(buf);
      // Explicit percent width is respected: fills the viewport, not the wide content
      expect(box.hasExplicitWidth).toBe(true);
      expect(box.rect.width).toBe(18);
      expect(sb.maxScrollX).toBe(0);
    });

    it('auto-sized wide content still overflows (no explicit width)', () => {
      const sb = createScrollBox({width: 20, height: 10}); // viewport width=18
      const box = createBox({height: 3}); // no width → auto, intrinsic driven by content
      box.addChild(createTextWidget('x'.repeat(30))); // intrinsic width 30 > viewport
      sb.addChild(box);
      const buf = new DrawListBuffer();
      sb.emitDrawCommands(buf);
      expect(box.hasExplicitWidth).toBe(false);
      expect(sb.maxScrollX).toBeGreaterThan(0);
    });

    it('applies scrollOffsetX to children x position', () => {
      const sb = createScrollBox({width: 20, height: 10}); // viewport x=1, width=18
      const wide = createTextWidget('x'.repeat(30));
      sb.addChild(wide);
      sb.scrollToX(5);
      const buf = new DrawListBuffer();
      sb.emitDrawCommands(buf);
      // child x = viewport.x - scrollOffsetX = 1 - 5 = -4
      expect(wide.rect.x).toBe(-4);
    });
  });

  describe('wheel', () => {
    it('default wheel scrolls Y (unchanged behavior)', () => {
      // Need vertical scrollability: 10 children of intrinsic height 1 → contentHeight=10, maxScrollY=2
      const sb = createWideScrollBox({childCount: 10, childWidth: 30});
      sb.dispatch('wheel', {wheelDeltaY: 1, x: 5, y: 5, button: 0, buttons: 0, isRelease: false, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false});
      // wheelDeltaY * scrollSpeed = 1 * 3 = 3, clamped to maxScrollY=2
      expect(sb.scrollOffsetY).toBe(2);
      expect(sb.scrollOffsetX).toBe(0);
    });

    it('Shift+wheel scrolls X', () => {
      const sb = createWideScrollBox({childWidth: 30});
      sb.dispatch('wheel', {wheelDeltaY: 1, x: 5, y: 5, button: 0, buttons: 0, isRelease: false, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false});
      expect(sb.scrollOffsetX).toBe(3); // wheelDeltaY * scrollSpeed = 1 * 3
      expect(sb.scrollOffsetY).toBe(0);
    });

    it('Shift+wheel negative delta scrolls left', () => {
      const sb = createWideScrollBox({childWidth: 30});
      sb.scrollToX(10);
      sb.dispatch('wheel', {wheelDeltaY: -1, x: 5, y: 5, button: 0, buttons: 0, isRelease: false, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false});
      expect(sb.scrollOffsetX).toBe(7); // 10 - 3
    });
  });

  describe('keyboard', () => {
    it('ArrowRight scrolls by 1', () => {
      const sb = createWideScrollBox({childWidth: 30});
      sb.handleKey(key({key: 'ArrowRight'}));
      expect(sb.scrollOffsetX).toBe(1);
    });

    it('ArrowLeft scrolls back by 1', () => {
      const sb = createWideScrollBox({childWidth: 30});
      sb.handleKey(key({key: 'ArrowRight'}));
      sb.handleKey(key({key: 'ArrowRight'}));
      sb.handleKey(key({key: 'ArrowLeft'}));
      expect(sb.scrollOffsetX).toBe(1);
    });

    it('ArrowLeft clamps at 0', () => {
      const sb = createWideScrollBox({childWidth: 30});
      sb.handleKey(key({key: 'ArrowLeft'}));
      expect(sb.scrollOffsetX).toBe(0);
    });

    it('ArrowRight clamps at maxScrollX', () => {
      const sb = createWideScrollBox({childWidth: 30}); // maxScrollX = 12
      for (let i = 0; i < 20; i++) {
        sb.handleKey(key({key: 'ArrowRight'}));
      }

      expect(sb.scrollOffsetX).toBe(12);
    });

    it('ArrowLeft/Right do not affect Y offset', () => {
      const sb = createWideScrollBox({childCount: 5, childWidth: 30});
      sb.handleKey(key({key: 'ArrowRight'}));
      expect(sb.scrollOffsetY).toBe(0);
    });
  });

  describe('horizontal scrollbar thumb drag', () => {
    // Geometry: childWidth=30, viewport width=18 → maxScrollX=12
    // trackWidth=18, thumbRatio=18/30=0.6, thumbSize=round(0.6*18)=11
    // scrollableRange=18-11=7, maxScroll=12
    // Horizontal scrollbar: row 9, cols 1-18
    function createHorizontalScrollable(): ScrollBoxWidget {
      return createWideScrollBox({childWidth: 30});
    }

    it('dragging thumb right scrolls proportionally', () => {
      const sb = createHorizontalScrollable();
      // mousedown on thumb at col 1 (thumbOffset=0 initially)
      sb.dispatch('mousedown', mouse({x: 1, y: 9, button: 0}));
      // mousemove to col 8 → delta=7, scrollableRange=7, maxScroll=12 → scrollToX(round(7/7*12))=12
      sb.dispatch('mousemove', mouse({x: 8, y: 9, buttons: 1}));
      expect(sb.scrollOffsetX).toBe(12);
    });

    it('dragging thumb partially scrolls partially', () => {
      const sb = createHorizontalScrollable();
      sb.dispatch('mousedown', mouse({x: 1, y: 9, button: 0}));
      // delta=3 → scrollToX(round(3/7*12))=round(5.14)=5
      sb.dispatch('mousemove', mouse({x: 4, y: 9, buttons: 1}));
      expect(sb.scrollOffsetX).toBe(5);
    });

    it('mouseup stops horizontal thumb dragging', () => {
      const sb = createHorizontalScrollable();
      sb.dispatch('mousedown', mouse({x: 1, y: 9, button: 0}));
      sb.dispatch('mouseup', mouse({x: 1, y: 9, button: 0, isRelease: true}));
      sb.dispatch('mousemove', mouse({x: 8, y: 9, buttons: 1}));
      expect(sb.scrollOffsetX).toBe(0);
    });

    it('mousemove without buttons stops horizontal thumb dragging', () => {
      const sb = createHorizontalScrollable();
      sb.dispatch('mousedown', mouse({x: 1, y: 9, button: 0}));
      sb.dispatch('mousemove', mouse({x: 8, y: 9, buttons: 0}));
      expect(sb.scrollOffsetX).toBe(0);
    });

    it('clicking track left of thumb scrolls page left', () => {
      const sb = createHorizontalScrollable();
      sb.scrollToX(10);
      sb.dispatch('mousedown', mouse({x: 1, y: 9, button: 0}));
      // track-left → scrollByX(-viewport.width) = -18, clamped to 0
      expect(sb.scrollOffsetX).toBe(0);
    });

    it('clicking track right of thumb scrolls page right', () => {
      const sb = createHorizontalScrollable();
      // Initial thumb at col 1 (offset 0), click on col 15 (in track-right zone)
      // track-right → scrollByX(18), clamped to 12
      sb.dispatch('mousedown', mouse({x: 15, y: 9, button: 0}));
      expect(sb.scrollOffsetX).toBe(12);
    });

    it('clicking on content area does not trigger horizontal thumb drag', () => {
      const sb = createHorizontalScrollable();
      sb.scrollToX(5);
      // Click on content area (row 5, not on row 9 horizontal scrollbar)
      sb.dispatch('mousedown', mouse({x: 5, y: 5, button: 0}));
      sb.dispatch('mousemove', mouse({x: 10, y: 5, buttons: 1}));
      // Content drag engages both axes: X delta=5 → scrollOffsetX = max(0, 5-5)=0
      expect(sb.scrollOffsetX).toBe(0);
    });

    it('horizontal thumb drag does not scroll when content fits viewport', () => {
      const sb = createWideScrollBox({childWidth: 10}); // maxScrollX=0
      sb.dispatch('mousedown', mouse({x: 1, y: 9, button: 0}));
      sb.dispatch('mousemove', mouse({x: 8, y: 9, buttons: 1}));
      expect(sb.scrollOffsetX).toBe(0);
    });

    it('horizontal thumb drag clamps to valid range', () => {
      const sb = createHorizontalScrollable();
      sb.dispatch('mousedown', mouse({x: 1, y: 9, button: 0}));
      sb.dispatch('mousemove', mouse({x: 100, y: 9, buttons: 1}));
      expect(sb.scrollOffsetX).toBe(sb.maxScrollX);
    });
  });

  describe('content drag with X axis', () => {
    it('dragging right decreases scrollOffsetX (natural scroll)', () => {
      const sb = createWideScrollBox({childWidth: 30}); // maxScrollX=12
      sb.scrollToX(8);
      sb.dispatch('mousedown', mouse({x: 5, y: 5, button: 0}));
      // drag right by 3 → scrollToX(8 - 3) = 5
      sb.dispatch('mousemove', mouse({x: 8, y: 5, buttons: 1}));
      expect(sb.scrollOffsetX).toBe(5);
    });

    it('dragging left increases scrollOffsetX (natural scroll)', () => {
      const sb = createWideScrollBox({childWidth: 30});
      sb.scrollToX(5);
      sb.dispatch('mousedown', mouse({x: 8, y: 5, button: 0}));
      // drag left by 3 → scrollToX(5 - (-3)) = 8
      sb.dispatch('mousemove', mouse({x: 5, y: 5, buttons: 1}));
      expect(sb.scrollOffsetX).toBe(8);
    });
  });

  describe('both axes', () => {
    it('content drag pans both X and Y simultaneously', () => {
      // 10 children of width 30 → both axes scrollable. contentHeight=10, maxScrollY=2; contentWidth=30, maxScrollX=12.
      const sb = createWideScrollBox({childCount: 10, childWidth: 30});
      sb.scrollTo(2);
      sb.scrollToX(5);
      sb.dispatch('mousedown', mouse({x: 5, y: 5, button: 0}));
      // drag right by 2 (X delta), down by 3 (Y delta)
      sb.dispatch('mousemove', mouse({x: 7, y: 8, buttons: 1}));
      // scrollOffsetY = 2 - 3 = -1 → clamped to 0; scrollOffsetX = 5 - 2 = 3
      expect(sb.scrollOffsetY).toBe(0);
      expect(sb.scrollOffsetX).toBe(3);
    });
  });
});

// Geometry: createScrollBox default 20×10 with solid borders → viewport {x:1, y:1, w:18, h:8}
describe('flex layout (ScrollBox)', () => {
  function render(sb: ScrollBoxWidget) {
    const buf = new DrawListBuffer();
    buf.reset();
    sb.emitDrawCommands(buf);
  }

  it('flexGrow distributes viewport free space', () => {
    const sb = createScrollBox({height: 10}); // viewport height = 8
    const c1 = createTextWidget('a'); // intrinsic height 1
    const c2 = createTextWidget('b');
    c1.setFlexGrow(1);
    c2.setFlexGrow(1);
    sb.addChild(c1);
    sb.addChild(c2);
    render(sb);
    // mainSize=8, totalBase=2, freeSpace=6; each grows by 3 → height 4
    expect(c1.rect.height).toBe(4);
    expect(c2.rect.height).toBe(4);
  });

  it('flexShrink compresses overflowing children to fit viewport', () => {
    const sb = createScrollBox({height: 10}); // viewport height = 8
    const c1 = createBox({height: 5});
    const c2 = createBox({height: 5});
    c1.setFlexShrink(1);
    c2.setFlexShrink(1);
    sb.addChild(c1);
    sb.addChild(c2);
    render(sb);
    // mainSize=8, totalBase=10, overflow=2; each shrinks by 1 → height 4
    expect(c1.rect.height).toBe(4);
    expect(c2.rect.height).toBe(4);
  });

  it('justifyContent centers children within viewport', () => {
    const sb = createScrollBox({height: 10}); // viewport height = 8, y = 1
    sb.setJustifyContent('center');
    const c1 = createTextWidget('a'); // intrinsic height 1
    const c2 = createTextWidget('b');
    sb.addChild(c1);
    sb.addChild(c2);
    render(sb);
    // mainSize=8, totalBase=2, freeSpace=6, startOffset=3
    // c1 at y = viewport.y(1) + 3 = 4; c2 at y = 4 + 1 = 5
    expect(c1.rect.y).toBe(4);
    expect(c2.rect.y).toBe(5);
  });

  it('alignSelf overrides parent stretch for cross-axis', () => {
    const sb = createScrollBox({width: 20, height: 10}); // viewport {x:1,y:1,w:18,h:8}
    const c1 = createTextWidget('ab'); // intrinsic width 2
    c1.setAlignSelf('center');
    sb.addChild(c1);
    render(sb);
    // crossSize = max(18, 2) = 18; center: floor((18-2)/2) = 8
    // c1.x = viewport.x(1) + 8 = 9; width stays 2 (not stretched)
    expect(c1.rect.x).toBe(9);
    expect(c1.rect.width).toBe(2);
  });

  it('flexBasis overrides intrinsic main-axis size', () => {
    const sb = createScrollBox({height: 10}); // viewport height = 8
    const c1 = createTextWidget('a'); // intrinsic height 1
    c1.setFlexBasis(3);
    sb.addChild(c1);
    render(sb);
    expect(c1.rect.height).toBe(3);
  });

  it('horizontal direction lays out children left-to-right', () => {
    const sb = createScrollBox({width: 20, height: 10}); // viewport {x:1,y:1,w:18,h:8}
    sb.setDirection('horizontal');
    const c1 = createTextWidget('ab'); // intrinsic width 2
    const c2 = createTextWidget('cd');
    sb.addChild(c1);
    sb.addChild(c2);
    render(sb);
    // mainSize=18, c1 at x=1+0=1, c2 at x=1+2=3
    expect(c1.rect.x).toBe(1);
    expect(c2.rect.x).toBe(3);
  });

  it('scroll offset is applied after flex layout', () => {
    const sb = createScrollBox({height: 10}); // viewport height = 8, y = 1
    const c1 = createBox({height: 3});
    const c2 = createBox({height: 3});
    const c3 = createBox({height: 3});
    sb.addChild(c1);
    sb.addChild(c2);
    sb.addChild(c3);
    // totalBase=9, mainSize=8 → content height 9, maxScroll = 9-8 = 1
    sb.scrollToBottom(); // scrollOffsetY = 1
    render(sb);
    // c1 at mainPos=0: y = 1 + 0 - 1 = 0
    // c2 at mainPos=3: y = 1 + 3 - 1 = 3
    // c3 at mainPos=6: y = 1 + 6 - 1 = 6
    expect(c1.rect.y).toBe(0);
    expect(c2.rect.y).toBe(3);
    expect(c3.rect.y).toBe(6);
  });

  it('setDirection triggers relayout', () => {
    const sb = createScrollBox({width: 20, height: 10});
    const c1 = createTextWidget('ab');
    const c2 = createTextWidget('cd');
    sb.addChild(c1);
    sb.addChild(c2);
    render(sb);
    expect(c2.rect.y).toBe(2); // vertical: c1 at y=1, c2 at y=2

    sb.setDirection('horizontal');
    render(sb);
    expect(c2.rect.x).toBe(3); // horizontal: c1 at x=1, c2 at x=3
  });

  it('invisible children (v-show) do not occupy layout space or content height', () => {
    // Mirrors App.vue: a v-show sibling (TextDemo) stays mounted but hidden.
    const sb = createScrollBox({height: 10}); // viewport height = 8
    const a = createBox({height: 3});
    const b = createBox({height: 3});
    const hidden = createBox({height: 10});
    hidden.setVisible(false);
    sb.addChild(a);
    sb.addChild(b);
    sb.addChild(hidden);
    render(sb);
    // Only a+b are visible → content height 6, fits viewport → no scroll.
    expect(sb.maxScrollY).toBe(0);
    // hidden takes no slot: b sits right after a.
    expect(b.rect.y).toBe(a.rect.y + 3);
  });

  it('relayouts and extends scroll range when a hidden child becomes visible', () => {
    const sb = createScrollBox({height: 10}); // viewport height = 8
    const a = createBox({height: 3});
    const hidden = createBox({height: 10});
    hidden.setVisible(false);
    sb.addChild(a);
    sb.addChild(hidden);
    render(sb);
    expect(sb.maxScrollY).toBe(0); // only a (3) visible, fits viewport

    hidden.setVisible(true);
    render(sb); // visibility change must trigger relayout
    // visible content = 3 + 10 = 13, viewport 8 → maxScroll 5
    expect(sb.maxScrollY).toBe(5);
    // hidden (now visible) is laid out after a.
    expect(hidden.rect.y).toBe(a.rect.y + 3);
  });
});

// Geometry: createScrollBox default 20×10 with solid borders → viewport {x:1, y:1, w:18, h:8}
describe('position: absolute/fixed', () => {
  function render(sb: ScrollBoxWidget) {
    const buf = new DrawListBuffer();
    buf.reset();
    sb.emitDrawCommands(buf);
  }

  function renderBuf(sb: ScrollBoxWidget): DrawListBuffer {
    const buf = new DrawListBuffer();
    buf.reset();
    sb.emitDrawCommands(buf);
    return buf;
  }

  // Scan the binary buffer for the first DrawRect (cmd 0x10) whose height matches.
  function findRectY(buffer: ArrayBuffer, byteLength: number, height: number): number | undefined {
    const view = new DataView(buffer);
    let cursor = 8; // skip buffer header
    while (cursor < byteLength) {
      const cmdType = view.getUint16(cursor, true);
      const payloadLen = view.getUint32(cursor + 4, true);
      cursor += 8;
      if (cmdType === 0x10 && view.getInt16(cursor + 6, true) === height) {
        return view.getInt16(cursor + 2, true);
      }

      cursor += payloadLen;
    }

    return undefined;
  }

  // Return the paint order of DrawRect commands as their heights.
  function rectHeightsInOrder(buffer: ArrayBuffer, byteLength: number): number[] {
    const view = new DataView(buffer);
    let cursor = 8;
    const heights: number[] = [];
    while (cursor < byteLength) {
      const cmdType = view.getUint16(cursor, true);
      const payloadLen = view.getUint32(cursor + 4, true);
      cursor += 8;
      if (cmdType === 0x10) {
        heights.push(view.getInt16(cursor + 6, true));
      }

      cursor += payloadLen;
    }

    return heights;
  }

  it('absolute child keeps its own x/y (not repositioned by flex)', () => {
    const sb = createScrollBox({height: 10});
    const abs = createBox({x: 5, y: 7, width: 4, height: 3});
    abs.setPosition('absolute');
    sb.addChild(abs);
    render(sb);
    expect(abs.rect.x).toBe(5);
    expect(abs.rect.y).toBe(7);
  });

  it('fixed child keeps its own x/y', () => {
    const sb = createScrollBox({height: 10});
    const fixed = createBox({x: 2, y: 3, width: 4, height: 2});
    fixed.setPosition('fixed');
    sb.addChild(fixed);
    render(sb);
    expect(fixed.rect.x).toBe(2);
    expect(fixed.rect.y).toBe(3);
  });

  it('static children are still flex-laid-out (default)', () => {
    const sb = createScrollBox({height: 10}); // viewport y=1, h=8
    const a = createBox({height: 3});
    const b = createBox({height: 3});
    sb.addChild(a);
    sb.addChild(b);
    render(sb);
    expect(a.rect.y).toBe(1);
    expect(b.rect.y).toBe(4); // 1 + 3
  });

  it('absolute child does not affect static flex flow', () => {
    const sb = createScrollBox({height: 10});
    const a = createBox({height: 3});
    const abs = createBox({x: 10, y: 10, width: 4, height: 5});
    abs.setPosition('absolute');
    const b = createBox({height: 3});
    sb.addChild(a);
    sb.addChild(abs);
    sb.addChild(b);
    render(sb);
    expect(a.rect.y).toBe(1);
    expect(b.rect.y).toBe(4); // abs is skipped, b follows a directly
  });

  it('absolute child canvas coords are stable across scrolling', () => {
    const sb = createScrollBox({height: 10}); // viewport h=8
    const tall = createBox({height: 20}); // static, makes content scrollable
    const abs = createBox({x: 1, y: 1, width: 4, height: 3});
    abs.setPosition('absolute');
    sb.addChild(tall);
    sb.addChild(abs);
    render(sb);
    expect(abs.rect.y).toBe(1); // canvas coord
    sb.scrollTo(5);
    render(sb);
    // rect stays in canvas coords; the render-time translate handles scrolling.
    expect(abs.rect.y).toBe(1);
  });

  it('fixed child never scrolls', () => {
    const sb = createScrollBox({height: 10});
    const tall = createBox({height: 20});
    const fixed = createBox({x: 1, y: 1, width: 4, height: 2});
    fixed.setPosition('fixed');
    sb.addChild(tall);
    sb.addChild(fixed);
    render(sb);
    const beforeY = fixed.rect.y;
    sb.scrollTo(5);
    render(sb);
    expect(fixed.rect.y).toBe(beforeY);
  });

  it('absolute child contributes to content height (scrollable)', () => {
    const sb = createScrollBox({height: 10}); // viewport h=8, contentY=1
    const abs = createBox({x: 1, y: 1, width: 4, height: 5});
    abs.setPosition('absolute');
    abs.updateRect({y: 20}); // place far down the content canvas
    sb.addChild(abs);
    render(sb);
    // canvas bottom = 20 + 5 = 25; maxScroll = 25 - 8 = 17
    expect(sb.maxScrollY).toBe(17);
  });

  it('fixed child does not contribute to content height', () => {
    const sb = createScrollBox({height: 10}); // viewport h=8
    const fixed = createBox({x: 1, y: 50, width: 4, height: 5});
    fixed.setPosition('fixed');
    sb.addChild(fixed);
    render(sb);
    expect(sb.maxScrollY).toBe(0);
  });

  it('absolute child position survives a relayout (drag not clobbered)', () => {
    const sb = createScrollBox({height: 10});
    const abs = createBox({x: 5, y: 5, width: 4, height: 3});
    abs.setPosition('absolute');
    abs.setDraggable(true);
    sb.addChild(abs);
    render(sb);
    abs.updateRect({x: 8, y: 2}); // simulate a drag
    render(sb);
    expect(abs.rect.x).toBe(8);
    expect(abs.rect.y).toBe(2);
  });

  it('mousedown on a draggable child does not start content drag-scroll', () => {
    const sb = createScrollBox({height: 10});
    const draggable = createBox({height: 3});
    draggable.setDraggable(true);
    const tall = createBox({height: 20});
    sb.addChild(draggable);
    sb.addChild(tall);
    render(sb);
    const px = draggable.rect.x;
    const py = draggable.rect.y;
    sb.dispatch('mousedown', mouse({x: px, y: py, button: 0, buttons: 1}));
    sb.dispatch('mousemove', mouse({x: px, y: py + 3, button: undefined, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('absolute child canvas coords are unaffected by scroll (drag-safe)', () => {
    const sb = createScrollBox({height: 10}); // viewport h=8
    const tall = createBox({height: 30}); // static, scrollable
    const abs = createBox({x: 1, y: 1, width: 4, height: 3});
    abs.setPosition('absolute');
    sb.addChild(tall);
    sb.addChild(abs);
    render(sb);
    expect(abs.rect.y).toBe(1);

    sb.scrollTo(5);
    expect(abs.rect.y).toBe(1); // scroll never mutates canvas coords

    abs.updateRect({y: 2}); // user drags
    expect(abs.rect.y).toBe(2);

    sb.scrollTo(3);
    expect(abs.rect.y).toBe(2); // still the dragged canvas coord
  });

  it('absolute child renders at canvas + viewport - scrollOffset', () => {
    const sb = createScrollBox({x: 0, y: 4, width: 20, height: 10}); // viewport {x:1, y:5, w:18, h:8}
    const tall = createBox({height: 30}); // static, makes content scrollable
    const abs = createBox({x: 2, y: 3, width: 5, height: 3});
    abs.setPosition('absolute');
    sb.addChild(tall);
    sb.addChild(abs);

    let buf = renderBuf(sb);
    // scrollOffset=0: canvas(2,3) + viewport(1,5) − 0 → render y = 8
    expect(findRectY(buf.buffer, buf.byteLength, 3)).toBe(8);

    sb.scrollTo(4);
    buf = renderBuf(sb);
    // scrollOffset=4: render y = 3 + 5 − 4 = 4
    expect(findRectY(buf.buffer, buf.byteLength, 3)).toBe(4);
  });

  it('absolute child is hit-testable at its painted screen position (no scroll)', () => {
    const scene = new TuiScene({visible: true});
    const sb = createScrollBox({x: 0, y: 4, width: 20, height: 10}); // viewport {x:1, y:5, w:18, h:8}
    const abs = createBox({x: 2, y: 3, width: 5, height: 3});
    abs.setPosition('absolute');
    sb.addChild(abs);
    scene.mount(sb);
    sb.emitDrawCommands(new DrawListBuffer());

    // canvas(2,3) + viewport(1,5) → painted at screen (3,8)
    expect(scene.hitTest(mouse({x: 3, y: 8, button: 0, buttons: 1}))).toBe(abs);
  });

  it('absolute child hit-test follows the viewport − scroll translate', () => {
    const scene = new TuiScene({visible: true});
    const sb = createScrollBox({x: 0, y: 4, width: 20, height: 10}); // viewport {x:1, y:5}
    const tall = createBox({height: 30}); // static, makes content scrollable
    const abs = createBox({x: 2, y: 3, width: 5, height: 3});
    abs.setPosition('absolute');
    abs.setZIndex(1); // sit above the static filler so it is picked first
    sb.addChild(tall);
    sb.addChild(abs);
    scene.mount(sb);

    sb.scrollTo(4);
    sb.emitDrawCommands(new DrawListBuffer());
    // painted y = canvas 3 + viewport 5 − scroll 4 = 4
    expect(scene.hitTest(mouse({x: 3, y: 4, button: 0, buttons: 1}))).toBe(abs);
  });

  it('moving the ScrollBox parent shifts an absolute child by exactly the delta (no drift)', () => {
    const sb = createScrollBox({x: 0, y: 4, width: 20, height: 10}); // viewport {x:1, y:5}
    const abs = createBox({x: 2, y: 3, width: 5, height: 3});
    abs.setPosition('absolute');
    sb.addChild(abs);

    let buf = renderBuf(sb);
    const beforeY = findRectY(buf.buffer, buf.byteLength, 3); // canvas 3 + viewport 5 = 8
    expect(beforeY).toBe(8);

    // Simulate a drag: parent moves down by 6 (delta +6).
    sb.updateRect({y: 10}); // viewport y becomes 11
    expect(abs.rect.y).toBe(3); // canvas coords untouched (not double-shifted)

    buf = renderBuf(sb);
    const afterY = findRectY(buf.buffer, buf.byteLength, 3); // 3 + 11 = 14
    expect(afterY).toBe(14); // moved by exactly +6, not +12
  });

  it('mousedown on a draggable absolute child (at painted cell) does not drag-scroll', () => {
    const scene = new TuiScene({visible: true});
    const sb = createScrollBox({x: 0, y: 4, width: 20, height: 10});
    const abs = createBox({x: 2, y: 3, width: 5, height: 3});
    abs.setPosition('absolute');
    abs.setDraggable(true);
    const tall = createBox({height: 30});
    sb.addChild(tall);
    sb.addChild(abs);
    scene.mount(sb);
    sb.emitDrawCommands(new DrawListBuffer());

    // Press on the painted cell (screen 3,8) and drag — content must not scroll.
    sb.dispatch('mousedown', mouse({x: 3, y: 8, button: 0}));
    sb.dispatch('mousemove', mouse({x: 3, y: 11, button: undefined, buttons: 1}));
    expect(sb.scrollOffsetY).toBe(0);
  });

  it('children paint in zIndex ascending order (low first, high on top)', () => {
    const sb = createScrollBox({height: 10});
    const top = createBox({x: 1, y: 1, width: 5, height: 3}); // height 3
    top.setPosition('absolute');
    top.setZIndex(2);
    const bottom = createBox({x: 1, y: 1, width: 5, height: 4}); // height 4
    bottom.setPosition('absolute');
    bottom.setZIndex(0);
    // Add top (zIndex=2) FIRST, bottom (zIndex=0) SECOND — reverse of paint order.
    sb.addChild(top);
    sb.addChild(bottom);
    const buf = renderBuf(sb);
    const heights = rectHeightsInOrder(buf.buffer, buf.byteLength);
    const idxH4 = heights.indexOf(4); // zIndex=0
    const idxH3 = heights.indexOf(3); // zIndex=2
    expect(idxH4).toBeGreaterThan(-1);
    expect(idxH3).toBeGreaterThan(-1);
    // zIndex=0 (h=4) painted before zIndex=2 (h=3) → 2 ends up on top.
    expect(idxH4).toBeLessThan(idxH3);
  });
});
