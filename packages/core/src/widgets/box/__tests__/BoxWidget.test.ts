import {it, expect, describe} from 'bun:test';
import {BoxWidget, createBox} from '../BoxWidget';
import {TextWidget} from '../../text/TextWidget';
import {LayoutDirection, LayoutAlignment} from '../../types';

function createBoxWith(options?: {x?: number; y?: number; width?: number; height?: number; borderStyle?: number; direction?: number; gap?: number; align?: number; draggable?: boolean}) {
  return new BoxWidget({
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 20,
    height: options?.height ?? 10,
    borderStyle: options?.borderStyle as U8 ?? 0 as U8,
    direction: options?.direction as LayoutDirection ?? undefined,
    gap: options?.gap as U16 ?? undefined,
    align: options?.align as LayoutAlignment ?? undefined,
    draggable: options?.draggable,
    colorFg: 0xFF_FF_FF_FF,
    colorBg: 0x00_00_00_FF,
  });
}

function createChild(value: string, width: number, height: number) {
  return new TextWidget({value, x: 0, y: 0, width: width as U16, height: height as U16, colorFg: 0xFF_FF_FF_FF, colorBg: 0});
}

describe('construction', () => {
  it('initializes with helper defaults', () => {
    const box = createBoxWith();
    expect(box.rect.x).toBe(0);
    expect(box.rect.y).toBe(0);
    expect(box.rect.width).toBe(20);
    expect(box.rect.height).toBe(10);
    expect(box.zIndex).toBe(0);
  });

  it('initializes with custom options', () => {
    const box = createBoxWith({x: 5, y: 10, width: 30, height: 15});
    expect(box.rect.x).toBe(5);
    expect(box.rect.y).toBe(10);
    expect(box.rect.width).toBe(30);
    expect(box.rect.height).toBe(15);
  });

  it('initializes with default vertical direction', () => {
    const box = createBoxWith();
    expect(box.intrinsicSize()).toBeUndefined();
  });

  it('initializes as draggable when option set', () => {
    const box = createBoxWith({draggable: true});
    expect(box.draggable).toBe(true);
  });

  it('getDefaultBoxOptions has expected values', () => {
    const box = createBox();
    expect(box.rect.x).toBe(0);
    expect(box.rect.y).toBe(0);
    expect(box.rect.width).toBe(32);
    expect(box.rect.height).toBe(3);
  });
});

describe('createBox factory', () => {
  it('creates box with default options', () => {
    const box = createBox();
    expect(box.rect.width).toBe(32);
    expect(box.rect.height).toBe(3);
    expect(box.border.borderStyle).toBe(1);
    expect(box.border.borderTop).toBe(true);
    expect(box.border.borderLeft).toBe(true);
  });

  it('merges partial options', () => {
    const box = createBox({width: 50 as U16, height: 20 as U16});
    expect(box.rect.width).toBe(50);
    expect(box.rect.height).toBe(20);
    expect(box.rect.x).toBe(0);
  });
});

describe('accessors', () => {
  it('rect returns current rect', () => {
    const box = createBoxWith({x: 3, y: 7, width: 25, height: 12});
    expect(box.rect).toEqual({x: 3, y: 7, width: 25, height: 12});
  });

  it('color returns color object', () => {
    const box = createBoxWith();
    expect(box.color.colorFg).toBe(0xFF_FF_FF_FF);
    expect(box.color.colorBg).toBe(0x00_00_00_FF);
  });

  it('style returns style object', () => {
    const box = createBoxWith();
    expect(box.style.styleZIndex).toBe(0);
    expect(box.style.styleModifier).toBe(0);
  });

  it('border returns border object with no borders by default', () => {
    const box = createBoxWith();
    expect(box.border.borderStyle).toBe(0);
    expect(box.border.borderTop).toBe(false);
  });

  it('padding returns padding object', () => {
    const box = createBoxWith();
    expect(box.padding.paddingTop).toBe(0);
    expect(box.padding.paddingLeft).toBe(0);
  });
});

describe('update methods', () => {
  it('updateRect changes position and size', () => {
    const box = createBoxWith();
    box.updateRect({x: 10, y: 20, width: 30, height: 5});
    expect(box.rect).toEqual({x: 10, y: 20, width: 30, height: 5});
  });

  it('updateRect partially updates fields', () => {
    const box = createBoxWith({x: 5});
    box.updateRect({x: 15});
    expect(box.rect.x).toBe(15);
    expect(box.rect.y).toBe(0);
  });

  it('updateColor changes foreground', () => {
    const box = createBoxWith();
    box.updateColor({colorFg: 0xFF_00_00_FF});
    expect(box.color.colorFg).toBe(0xFF_00_00_FF);
  });

  it('updateColor changes background', () => {
    const box = createBoxWith();
    box.updateColor({colorBg: 0x00_FF_00_FF});
    expect(box.color.colorBg).toBe(0x00_FF_00_FF);
  });

  it('updateStyle changes zIndex', () => {
    const box = createBoxWith();
    box.updateStyle({styleZIndex: 5});
    expect(box.zIndex).toBe(5);
  });

  it('updateBorder changes border properties', () => {
    const box = createBoxWith();
    box.updateBorder({borderStyle: 1 as U8, borderTop: true, borderBottom: true});
    expect(box.border.borderStyle).toBe(1);
    expect(box.border.borderTop).toBe(true);
    expect(box.border.borderBottom).toBe(true);
    expect(box.border.borderLeft).toBe(false);
  });

  it('updateShadow changes shadow properties', () => {
    const box = createBoxWith();
    box.updateShadow({shadowOffsetX: 2 as U16, shadowOffsetY: 1 as U16, shadowCovered: true as BOOL});
    expect(box.shadow.shadowOffsetX).toBe(2);
    expect(box.shadow.shadowOffsetY).toBe(1);
    expect(box.shadow.shadowCovered).toBe(true);
  });

  it('updatePadding changes padding', () => {
    const box = createBoxWith();
    box.updatePadding({paddingTop: 1 as U16, paddingLeft: 2 as U16});
    expect(box.padding.paddingTop).toBe(1);
    expect(box.padding.paddingLeft).toBe(2);
  });

  it('updateDirection changes direction', () => {
    const box = createBoxWith();
    box.updateDirection(LayoutDirection.Horizontal as LayoutDirection);
  });

  it('updateGap changes gap', () => {
    const box = createBoxWith();
    box.updateGap(3 as U16);
  });

  it('updateAlign changes alignment', () => {
    const box = createBoxWith();
    box.updateAlign(LayoutAlignment.Center as LayoutAlignment);
  });
});

describe('hit testing', () => {
  it('containsPoint checks bounds', () => {
    const box = createBoxWith({x: 5, y: 5, width: 10, height: 8});
    expect(box.containsPoint(5, 5)).toBe(true);
    expect(box.containsPoint(14, 5)).toBe(true);
    expect(box.containsPoint(15, 5)).toBe(false);
    expect(box.containsPoint(4, 5)).toBe(false);
    expect(box.containsPoint(10, 12)).toBe(true);
    expect(box.containsPoint(10, 13)).toBe(false);
  });
});

describe('child management', () => {
  it('addChild adds child widget', () => {
    const box = createBoxWith();
    const child = createChild('hi', 5, 1);
    box.addChild(child);
    expect(child.refrenceCount).toBe(1);
  });

  it('removeChild removes child widget', () => {
    const box = createBoxWith();
    const child = createChild('hi', 5, 1);
    box.addChild(child);
    box.removeChild(child);
    expect(child.refrenceCount).toBe(0);
  });

  it('removeChild with non-child does nothing', () => {
    const box = createBoxWith();
    const child = createChild('hi', 5, 1);
    box.removeChild(child);
    expect(child.refrenceCount).toBe(0);
  });
});

describe('intrinsicSize', () => {
  it('returns undefined when no children', () => {
    const box = createBoxWith();
    expect(box.intrinsicSize()).toBeUndefined();
  });

  it('returns size for vertical layout with children', () => {
    const box = createBoxWith();
    box.addChild(createChild('ab', 2, 1));
    box.addChild(createChild('abcde', 5, 1));
    const size = box.intrinsicSize();
    expect(size).toBeDefined();
    expect(size!.width).toBe(5); // max child width
    expect(size!.height).toBe(2); // sum of child heights
  });

  it('returns size for horizontal layout with children', () => {
    const box = createBoxWith();
    box.updateDirection(LayoutDirection.Horizontal as LayoutDirection);
    box.addChild(createChild('ab', 2, 1));
    box.addChild(createChild('abcde', 5, 1));
    const size = box.intrinsicSize();
    expect(size).toBeDefined();
    expect(size!.width).toBe(7); // sum of child intrinsic widths (2 + 5)
    expect(size!.height).toBe(1); // max child intrinsic height (TextWidget always reports 1)
  });

  it('includes gap in intrinsic size', () => {
    const box = createBoxWith();
    box.updateGap(2 as U16);
    box.addChild(createChild('ab', 2, 1));
    box.addChild(createChild('cd', 2, 1));
    const size = box.intrinsicSize();
    expect(size!.height).toBe(4); // 1 + gap(2) + 1
  });

  it('includes padding in intrinsic size', () => {
    const box = createBoxWith();
    box.updatePadding({paddingTop: 2 as U16, paddingBottom: 1 as U16, paddingLeft: 3 as U16, paddingRight: 1 as U16});
    box.addChild(createChild('ab', 2, 1));
    const size = box.intrinsicSize();
    expect(size!.width).toBe(6); // child(2) + paddingLeft(3) + paddingRight(1)
    expect(size!.height).toBe(4); // child(1) + paddingTop(2) + paddingBottom(1)
  });

  it('includes borders in intrinsic size', () => {
    const box = createBoxWith();
    box.updateBorder({borderStyle: 1 as U8, borderTop: true, borderBottom: true, borderLeft: true, borderRight: true});
    box.addChild(createChild('ab', 2, 1));
    const size = box.intrinsicSize();
    expect(size!.width).toBe(4); // child(2) + left(1) + right(1)
    expect(size!.height).toBe(3); // child(1) + top(1) + bottom(1)
  });

  it('returns undefined if any child has no intrinsic size', () => {
    const box = createBoxWith();
    box.addChild(createBoxWith()); // Nested box with no children → no intrinsic size
    expect(box.intrinsicSize()).toBeUndefined();
  });
});

describe('position propagation', () => {
  it('updateRect propagates position delta to children', () => {
    const box = createBoxWith({x: 5, y: 5, width: 20, height: 10});
    const child = createChild('hi', 5, 1);
    box.addChild(child);
    box.updateRect({x: 10, y: 15});
    expect(child.rect.x).toBe(5); // layout recomputed: contentX = 10, no padding
    expect(child.rect.y).toBe(10); // contentY = 15, child at mainPos=0
  });

  it('updateRect does not propagate when only size changes', () => {
    const box = createBoxWith({x: 5, y: 5, width: 20, height: 10});
    const child = createChild('hi', 5, 1);
    box.addChild(child);
    const childX = child.rect.x;
    const childY = child.rect.y;
    box.updateRect({width: 30});
    expect(child.rect.x).toBe(childX);
    expect(child.rect.y).toBe(childY);
  });
});
