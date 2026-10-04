import {it, expect, describe} from 'bun:test';
import {BoxWidget, createBox} from '../BoxWidget';
import {TextWidget} from '../../text/TextWidget';
import {DrawListBuffer} from '../../../draw-list/DrawListBuffer';
import {DrawCmd} from '../../../draw-list/types';

function createBoxWith(options?: {x?: number; y?: number; width?: number; height?: number; borderStyle?: string; border?: boolean; direction?: string; gap?: number; align?: string; justifyContent?: string; flexWrap?: string; alignContent?: string; draggable?: boolean}) {
  return new BoxWidget({
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 20,
    height: options?.height ?? 10,
    border: options?.border,
    borderStyle: (options?.borderStyle ?? 'none') as 'solid',
    direction: options?.direction as 'vertical' ?? undefined,
    gap: options?.gap as U16 ?? undefined,
    align: options?.align as 'start' ?? undefined,
    justifyContent: options?.justifyContent as 'start' ?? undefined,
    flexWrap: options?.flexWrap as 'wrap' ?? undefined,
    alignContent: options?.alignContent as 'center' ?? undefined,
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
    box.updateBorder({borderStyle: 'solid', borderTop: true, borderBottom: true});
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

  it('setDirection changes direction', () => {
    const box = createBoxWith();
    box.setDirection('horizontal');
  });

  it('setGap changes gap', () => {
    const box = createBoxWith();
    box.setGap(3 as U16);
  });

  it('setAlign changes alignment', () => {
    const box = createBoxWith();
    box.setAlign('center');
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

  it('absolute child is hit-testable at its painted (content-offset) position', () => {
    const box = createBoxWith({x: 10, y: 10, width: 20, height: 10, borderStyle: 'solid', border: true});
    const abs = createBox({x: 2, y: 3, width: 5, height: 3});
    abs.setPosition('absolute');
    box.addChild(abs);
    box.emitDrawCommands(new DrawListBuffer());

    // content origin = box(10,10) + border(1) = (11,11); local (2,3) → painted (13,14)
    expect(box.hitTestDeep(13, 14)).toBe(abs);
    // raw local coord (2,3) is not where it paints — must fall through to the box
    expect(box.hitTestDeep(2, 3)).toBe(box);
  });
});

describe('child management', () => {
  it('addChild adds child widget', () => {
    const box = createBoxWith();
    const child = createChild('hi', 5, 1);
    box.addChild(child);
    expect(child.referenceCount).toBe(1);
  });

  it('removeChild removes child widget', () => {
    const box = createBoxWith();
    const child = createChild('hi', 5, 1);
    box.addChild(child);
    box.removeChild(child);
    expect(child.referenceCount).toBe(0);
  });

  it('removeChild with non-child does nothing', () => {
    const box = createBoxWith();
    const child = createChild('hi', 5, 1);
    box.removeChild(child);
    expect(child.referenceCount).toBe(0);
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
    box.setDirection('horizontal');
    box.addChild(createChild('ab', 2, 1));
    box.addChild(createChild('abcde', 5, 1));
    const size = box.intrinsicSize();
    expect(size).toBeDefined();
    expect(size!.width).toBe(7); // sum of child intrinsic widths (2 + 5)
    expect(size!.height).toBe(1); // max child intrinsic height (TextWidget always reports 1)
  });

  it('includes gap in intrinsic size', () => {
    const box = createBoxWith();
    box.setGap(2 as U16);
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
    box.updateBorder({borderStyle: 'solid', borderTop: true, borderBottom: true, borderLeft: true, borderRight: true});
    box.addChild(createChild('ab', 2, 1));
    const size = box.intrinsicSize();
    expect(size!.width).toBe(4); // child(2) + left(1) + right(1)
    expect(size!.height).toBe(3); // child(1) + top(1) + bottom(1)
  });

  it('falls back to child rect when child has no intrinsic size', () => {
    const box = createBoxWith();
    const nested = createBoxWith(); // Nested box with no children → no intrinsic size
    box.addChild(nested);
    const size = box.intrinsicSize();
    expect(size).toBeDefined();
    expect(size!.width).toBe(20); // nested rect.width (no explicit width, no intrinsic)
    expect(size!.height).toBe(10); // nested hasExplicitHeight → rect.height
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

  it('dragging a parent does not double-shift an absolute child (rect stays content-relative)', () => {
    const box = createBoxWith({x: 10, y: 10, width: 20, height: 10, borderStyle: 'solid', border: true});
    const abs = createBox({x: 2, y: 3, width: 5, height: 3});
    abs.setPosition('absolute');
    box.addChild(abs);

    // Simulate a drag: parent moves from (10,10) to (15,15) — delta +5,+5.
    box.updateRect({x: 15, y: 15});

    // Absolute child keeps its content-relative coords (not shifted by the delta).
    expect(abs.rect.x).toBe(2);
    expect(abs.rect.y).toBe(3);
  });

  it('absolute child screen position follows parent drag by exactly the delta', () => {
    const box = createBoxWith({x: 10, y: 10, width: 20, height: 10, borderStyle: 'solid', border: true});
    const abs = createBox({x: 2, y: 3, width: 5, height: 3});
    abs.setPosition('absolute');
    box.addChild(abs);
    box.emitDrawCommands(new DrawListBuffer());

    // Before drag: content origin = (10,10) + border(1) = (11,11); painted at (13,14).
    expect(box.hitTestDeep(13, 14)).toBe(abs);

    // Drag parent by +5,+5.
    box.updateRect({x: 15, y: 15});
    box.emitDrawCommands(new DrawListBuffer());

    // After drag: content origin = (16,16); painted at (18,19) — exactly +5,+5.
    expect(box.hitTestDeep(18, 19)).toBe(abs);
    // The pre-drag screen cell must no longer hit the child (no double-count drift).
    expect(box.hitTestDeep(13, 14)).toBe(box);
  });
});

describe('overflow clipping', () => {
  function collectClipRects(box: BoxWidget): {x: number; y: number; width: number; height: number}[] {
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    const view = new DataView(buf.buffer);
    const clips: {x: number; y: number; width: number; height: number}[] = [];
    const cmdHeaderSize = 8;
    const bufferHeaderSize = 8;
    let offset = bufferHeaderSize;
    const end = buf.byteLength;
    while (offset < end) {
      const cmdType = view.getUint16(offset, true);
      const payloadLen = view.getUint32(offset + 4, true);
      if (cmdType === DrawCmd.PushClip) {
        clips.push({
          x: view.getUint16(offset + cmdHeaderSize, true),
          y: view.getUint16(offset + cmdHeaderSize + 2, true),
          width: view.getUint16(offset + cmdHeaderSize + 4, true),
          height: view.getUint16(offset + cmdHeaderSize + 6, true),
        });
      }

      offset += cmdHeaderSize + payloadLen;
    }

    return clips;
  }

  it('outer clip covers full box, inner clip covers content area inside border', () => {
    const box = createBoxWith({x: 0, y: 0, width: 20, height: 4, borderStyle: 'solid', border: true, direction: 'vertical'});
    box.addChild(createChild('a', 10, 1));

    const clips = collectClipRects(box);
    expect(clips[0]).toEqual({x: 0, y: 0, width: 20, height: 4});
    expect(clips[1]).toEqual({x: 1, y: 1, width: 18, height: 2});
  });

  it('inner clip accounts for padding', () => {
    const box = createBoxWith({x: 5, y: 10, width: 30, height: 6, borderStyle: 'solid', border: true, direction: 'vertical'});
    box.updatePadding({paddingTop: 1 as U16, paddingLeft: 2 as U16, paddingRight: 1 as U16, paddingBottom: 1 as U16});
    box.addChild(createChild('a', 10, 1));

    const clips = collectClipRects(box);
    expect(clips[0]).toEqual({x: 5, y: 10, width: 30, height: 6});
    expect(clips[1]).toEqual({x: 8, y: 12, width: 25, height: 2});
  });

  it('inner clip equals outer clip when no border and no padding', () => {
    const box = createBoxWith({x: 0, y: 0, width: 20, height: 10, direction: 'vertical'});
    box.addChild(createChild('a', 5, 1));

    const clips = collectClipRects(box);
    expect(clips[0]).toEqual({x: 0, y: 0, width: 20, height: 10});
    expect(clips[1]).toEqual({x: 0, y: 0, width: 20, height: 10});
  });

  it('overflow children are positioned beyond content area but clipped', () => {
    const box = createBoxWith({x: 0, y: 0, width: 20, height: 4, borderStyle: 'solid', border: true, direction: 'vertical', gap: 1});
    const c1 = createChild('a', 10, 1);
    const c2 = createChild('b', 10, 1);
    const c3 = createChild('c', 10, 1);
    box.addChild(c1);
    box.addChild(c2);
    box.addChild(c3);

    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);

    expect(c1.rect.y).toBe(1);
    expect(c2.rect.y).toBe(3);
    expect(c3.rect.y).toBe(5);
  });
});

describe('align cross-axis positioning (vertical layout)', () => {
  // Geometry: box width 20, height 10, no border, no padding.
  // Content area: x=0, y=0, width=20, height=10.
  // TextWidget intrinsic width = stringDisplayWidth(value); intrinsic height = 1.
  function layoutBox(align: string): {box: BoxWidget; child: TextWidget} {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align});
    const child = createChild('ab', 5, 1); // intrinsic width = 2 (string 'ab')
    box.addChild(child);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    return {box, child};
  }

  it('align: start places child at cross-axis position 0', () => {
    const {child} = layoutBox('start');
    expect(child.rect.x).toBe(0);
    expect(child.rect.width).toBe(2); // intrinsic width preserved (not stretched)
  });

  it('align: center centers child on cross axis', () => {
    const {child} = layoutBox('center');
    // floor((20 - 2) / 2) = 9
    expect(child.rect.x).toBe(9);
    expect(child.rect.width).toBe(2);
  });

  it('align: end anchors child to far edge of cross axis', () => {
    const {child} = layoutBox('end');
    // 20 - 2 = 18
    expect(child.rect.x).toBe(18);
    expect(child.rect.width).toBe(2);
  });

  it('align: stretch (default) fills child to full cross-axis size', () => {
    const {child} = layoutBox('stretch');
    expect(child.rect.x).toBe(0);
    expect(child.rect.width).toBe(20); // stretched to content width
  });

  it('default align when none specified is stretch', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical'});
    const child = createChild('ab', 5, 1);
    box.addChild(child);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(child.rect.width).toBe(20);
  });
});

describe('horizontal main-axis placement', () => {
  it('places children side-by-side on x axis', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal'});
    const c1 = createChild('ab', 5, 1); // intrinsic width 2
    const c2 = createChild('abcde', 10, 1); // intrinsic width 5
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);

    expect(c1.rect.x).toBe(0);
    expect(c2.rect.x).toBe(2); // 0 + intrinsic(2) + gap(0)
  });

  it('horizontal layout stretches children on cross axis (height)', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal'});
    const c1 = createChild('ab', 5, 1);
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);

    expect(c1.rect.height).toBe(10); // stretched to content height
    expect(c1.rect.y).toBe(0);
  });

  it('horizontal layout respects align: center on vertical cross axis', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', align: 'center'});
    const c1 = createChild('ab', 5, 1); // intrinsic height = 1
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);

    // floor((10 - 1) / 2) = 4
    expect(c1.rect.y).toBe(4);
    expect(c1.rect.height).toBe(1); // not stretched
  });

  it('horizontal layout respects align: end on vertical cross axis', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', align: 'end'});
    const c1 = createChild('ab', 5, 1);
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);

    // 10 - 1 = 9
    expect(c1.rect.y).toBe(9);
  });
});

describe('gap behavior', () => {
  it('vertical gap creates y-space between children', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', gap: 3});
    const c1 = createChild('a', 5, 1); // intrinsic height 1
    const c2 = createChild('b', 5, 1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);

    expect(c1.rect.y).toBe(0);
    expect(c2.rect.y).toBe(4); // 0 + height(1) + gap(3)
  });

  it('horizontal gap creates x-space between children', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', gap: 3});
    const c1 = createChild('ab', 5, 1); // intrinsic width 2
    const c2 = createChild('cd', 5, 1); // intrinsic width 2
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);

    expect(c1.rect.x).toBe(0);
    expect(c2.rect.x).toBe(5); // 0 + width(2) + gap(3)
  });

  it('gap is not added after the last child', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', gap: 5});
    const c1 = createChild('a', 5, 1);
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);

    // Single child: mainPos never advances past c1
    expect(c1.rect.y).toBe(0);
  });
});

describe('percent-sized children', () => {
  it('child with width percent spec resolves against content width', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'start'});
    const child = createBoxWith({width: 5, height: 3}); // nested Box (no intrinsic)
    child.setPercentSpec({width: '50%'});
    box.addChild(child);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);

    // 50% of content width 20 = 10
    expect(child.rect.width).toBe(10);
  });

  it('child with height percent spec resolves against content height', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'start'});
    const child = createBoxWith({width: 5, height: 3});
    child.setPercentSpec({height: '50%'});
    box.addChild(child);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);

    // 50% of content height 10 = 5
    expect(child.rect.height).toBe(5);
  });

  it('percent child is laid out using resolved size', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', align: 'start'});
    const c1 = createBoxWith({width: 5, height: 3});
    c1.setPercentSpec({width: '50%'});
    const c2 = createBoxWith({width: 5, height: 3});
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);

    // c1 resolved to width 10 (50% of 20), c2 placed after c1
    expect(c1.rect.x).toBe(0);
    expect(c1.rect.width).toBe(10);
    expect(c2.rect.x).toBe(10); // 0 + 10 + gap(0)
  });
});

describe('layout dirty flag', () => {
  it('setDirection triggers relayout on next emitDrawCommands', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical'});
    const c1 = createChild('ab', 5, 1);
    const c2 = createChild('cd', 5, 1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // Initially vertical: c1 at y=0, c2 at y=1
    expect(c1.rect.y).toBe(0);
    expect(c2.rect.y).toBe(1);

    box.setDirection('horizontal');
    buf.reset();
    box.emitDrawCommands(buf);
    // After relayout: horizontal, c1 at x=0, c2 at x=2
    expect(c1.rect.x).toBe(0);
    expect(c2.rect.x).toBe(2);
  });

  it('setAlign triggers relayout on next emitDrawCommands', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'start'});
    const child = createChild('ab', 5, 1);
    box.addChild(child);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(child.rect.x).toBe(0); // start

    box.setAlign('center');
    buf.reset();
    box.emitDrawCommands(buf);
    expect(child.rect.x).toBe(9); // floor((20-2)/2)
  });

  it('setGap triggers relayout on next emitDrawCommands', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', gap: 0});
    const c1 = createChild('a', 5, 1);
    const c2 = createChild('b', 5, 1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c2.rect.y).toBe(1); // no gap

    box.setGap(4 as U16);
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c2.rect.y).toBe(5); // 1 + gap(4)
  });

  it('updatePadding triggers relayout on next emitDrawCommands', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical'});
    const child = createChild('a', 5, 1);
    box.addChild(child);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(child.rect.x).toBe(0); // no padding

    box.updatePadding({paddingLeft: 3 as U16});
    buf.reset();
    box.emitDrawCommands(buf);
    expect(child.rect.x).toBe(3); // contentX = paddingLeft = 3
  });

  it('updateRect size change triggers relayout on next emitDrawCommands', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'stretch'});
    const child = createChild('ab', 5, 1);
    box.addChild(child);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(child.rect.width).toBe(20); // stretched to box width

    box.updateRect({width: 30});
    buf.reset();
    box.emitDrawCommands(buf);
    expect(child.rect.width).toBe(30); // re-stretched to new box width
  });

  it('position-only updateRect does not trigger relayout (delta propagation only)', () => {
    const box = createBoxWith({x: 0, y: 0, width: 20, height: 10, direction: 'vertical', align: 'stretch'});
    const child = createChild('ab', 5, 1);
    box.addChild(child);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // After layout: child at (0, 0), width=20
    expect(child.rect.x).toBe(0);
    expect(child.rect.width).toBe(20);

    box.updateRect({x: 5, y: 5});
    // No emitDrawCommands call — delta propagation should move child without relayout
    expect(child.rect.x).toBe(5); // 0 + deltaX(5)
    expect(child.rect.y).toBe(5); // 0 + deltaY(5)
    expect(child.rect.width).toBe(20); // unchanged (no relayout)
  });
});

describe('justifyContent (main-axis distribution)', () => {
  // Geometry: vertical layout, box height 10, content height 10.
  // 2 children, each intrinsic height 1 → total content 2, free space 8.
  function layoutWithJustify(justify: string): {c1: TextWidget; c2: TextWidget} {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'stretch', justifyContent: justify});
    const c1 = createChild('a', 5, 1);
    const c2 = createChild('b', 5, 1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    return {c1, c2};
  }

  it('start (default) packs children from top', () => {
    const {c1, c2} = layoutWithJustify('start');
    expect(c1.rect.y).toBe(0);
    expect(c2.rect.y).toBe(1);
  });

  it('center centers the block of children', () => {
    const {c1, c2} = layoutWithJustify('center');
    // freeSpace=8, startOffset = floor(8/2) = 4
    expect(c1.rect.y).toBe(4);
    expect(c2.rect.y).toBe(5);
  });

  it('end anchors children to bottom', () => {
    const {c1, c2} = layoutWithJustify('end');
    // startOffset = freeSpace = 8
    expect(c1.rect.y).toBe(8);
    expect(c2.rect.y).toBe(9);
  });

  it('space-between puts first at top, last at bottom, rest in middle', () => {
    const {c1, c2} = layoutWithJustify('space-between');
    // 2 children: startOffset=0, extraGap = floor(8 / (2-1)) = 8
    expect(c1.rect.y).toBe(0);
    expect(c2.rect.y).toBe(1 + 8); // 1 (c1 height) + 0 gap + 8 extraGap
  });

  it('space-around distributes equal padding around each child', () => {
    const {c1, c2} = layoutWithJustify('space-around');
    // perChild = floor(8/2) = 4; startOffset = floor(4/2) = 2; extraGap = 4
    expect(c1.rect.y).toBe(2);
    expect(c2.rect.y).toBe(2 + 1 + 4); // startOffset + c1 height + extraGap
  });

  it('space-evenly distributes equal space including edges', () => {
    const {c1, c2} = layoutWithJustify('space-evenly');
    // gap = floor(8/3) = 2; startOffset = 2; extraGap = 2
    expect(c1.rect.y).toBe(2);
    expect(c2.rect.y).toBe(2 + 1 + 2); // startOffset + c1 height + extraGap
  });

  it('justifyContent has no effect when content fills viewport', () => {
    // 10 children of height 1 fill the 10-row viewport exactly
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', justifyContent: 'center'});
    const children: TextWidget[] = [];
    for (let i = 0; i < 10; i++) {
      const c = createChild('x', 5, 1);
      box.addChild(c);
      children.push(c);
    }

    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // No free space → behaves like start
    expect(children[0]!.rect.y).toBe(0);
    expect(children[9]!.rect.y).toBe(9);
  });

  it('justifyContent works with horizontal layout', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', align: 'stretch', justifyContent: 'end'});
    const c1 = createChild('ab', 5, 1); // intrinsic width 2
    const c2 = createChild('cd', 5, 1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // totalBase=4, freeSpace=16, startOffset=16
    expect(c1.rect.x).toBe(16);
    expect(c2.rect.x).toBe(18);
  });

  it('setJustifyContent triggers relayout on next emitDrawCommands', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', justifyContent: 'start'});
    const c1 = createChild('a', 5, 1);
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.rect.y).toBe(0);

    box.setJustifyContent('center');
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.rect.y).toBe(4); // floor((10-1)/2)... wait, floor((10-1)/2) = 4 (freeSpace=9, /2=4)
  });
});

describe('flexGrow (per-child free-space distribution)', () => {
  it('child with flexGrow absorbs all free space', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'stretch'});
    const c1 = createChild('a', 5, 1); // intrinsic height 1
    c1.setFlexGrow(1);
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // freeSpace=9, totalGrow=1 → c1 absorbs 9, final height = 1 + 9 = 10
    expect(c1.rect.height).toBe(10);
  });

  it('flexGrow distributes proportionally between multiple children', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'stretch'});
    const c1 = createChild('a', 5, 1);
    c1.setFlexGrow(1);
    const c2 = createChild('b', 5, 1);
    c2.setFlexGrow(1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // freeSpace=8, each gets 4 → c1.height=5, c2.height=5
    expect(c1.rect.height).toBe(5);
    expect(c2.rect.height).toBe(5);
    expect(c2.rect.y).toBe(5);
  });

  it('flexGrow distributes by weight ratio', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'stretch'});
    const c1 = createChild('a', 5, 1);
    c1.setFlexGrow(3);
    const c2 = createChild('b', 5, 1);
    c2.setFlexGrow(1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // freeSpace=8; totalGrow=4; c1 share = floor(3/4*8)=6 → height=7; c2 share = floor(1/4*8)=2 → height=3
    // Remainder: 8-6-2=0, no adjustment
    expect(c1.rect.height).toBe(7);
    expect(c2.rect.height).toBe(3);
  });

  it('children with flexGrow=0 stay at base size', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'stretch'});
    const c1 = createChild('a', 5, 1);
    const c2 = createChild('b', 5, 1);
    c2.setFlexGrow(1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // freeSpace=8; only c2 grows → c1 stays at 1, c2 becomes 1+8=9
    expect(c1.rect.height).toBe(1);
    expect(c2.rect.height).toBe(9);
    expect(c2.rect.y).toBe(1);
  });

  it('flexGrow on horizontal axis distributes width', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', align: 'stretch'});
    const c1 = createChild('ab', 5, 1); // intrinsic width 2
    c1.setFlexGrow(1);
    const c2 = createChild('cd', 5, 1);
    c2.setFlexGrow(1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // freeSpace = 20 - 4 = 16; each gets 8 → width=10 each
    expect(c1.rect.width).toBe(10);
    expect(c2.rect.width).toBe(10);
    expect(c2.rect.x).toBe(10);
  });

  it('flexGrow absorbs free space so justifyContent has no effect', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'stretch', justifyContent: 'center'});
    const c1 = createChild('a', 5, 1);
    c1.setFlexGrow(1);
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // flexGrow absorbs all 9 freeSpace; center would offset by 4 but no free space remains
    expect(c1.rect.y).toBe(0);
    expect(c1.rect.height).toBe(10);
  });

  it('flexGrow default is 0', () => {
    const c = createChild('x', 5, 1);
    expect(c.flexGrow).toBe(0);
  });
});

describe('reverse direction', () => {
  it('vertical-reverse places first child at the bottom', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical-reverse', align: 'stretch'});
    const c1 = createChild('a', 5, 1); // intrinsic height 1
    const c2 = createChild('b', 5, 1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // Reverse: c1 (first) goes to bottom, c2 above it
    expect(c1.rect.y).toBe(9);
    expect(c2.rect.y).toBe(8);
  });

  it('horizontal-reverse places first child at the right', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal-reverse', align: 'stretch'});
    const c1 = createChild('ab', 5, 1); // intrinsic width 2
    const c2 = createChild('cd', 5, 1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // Reverse: c1 (first) at right, c2 to its left
    expect(c1.rect.x).toBe(18);
    expect(c2.rect.x).toBe(16);
  });

  it('vertical-reverse with gap stacks upward', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical-reverse', align: 'stretch', gap: 2});
    const c1 = createChild('a', 5, 1);
    const c2 = createChild('b', 5, 1);
    const c3 = createChild('c', 5, 1);
    box.addChild(c1);
    box.addChild(c2);
    box.addChild(c3);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // From bottom up: c1 at 9, c2 at 9-(1+2)=6, c3 at 6-(1+2)=3
    expect(c1.rect.y).toBe(9);
    expect(c2.rect.y).toBe(6);
    expect(c3.rect.y).toBe(3);
  });

  it('reverse with justifyContent center still centers the block', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical-reverse', align: 'stretch', justifyContent: 'center'});
    const c1 = createChild('a', 5, 1);
    const c2 = createChild('b', 5, 1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // freeSpace=8, startOffset=4; c1 first in reverse → at y=4 (lowest of the reversed block)
    // Wait: order is [c1, c2] in DOM; reversed iteration is c2, c1.
    // mainPos starts at 4. c2 placed at y=4, then c1 at y=4+1=5.
    expect(c2.rect.y).toBe(4);
    expect(c1.rect.y).toBe(5);
  });

  it('reverse direction interacts correctly with flexGrow', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical-reverse', align: 'stretch'});
    const c1 = createChild('a', 5, 1);
    c1.setFlexGrow(1);
    const c2 = createChild('b', 5, 1);
    c2.setFlexGrow(1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // Each gets 4 extra → heights 5,5. Reverse: c1 at bottom (y=5..9), c2 above (y=0..4)
    expect(c1.rect.height).toBe(5);
    expect(c2.rect.height).toBe(5);
    expect(c1.rect.y).toBe(5);
    expect(c2.rect.y).toBe(0);
  });
});

describe('flexShrink (per-child overflow compression)', () => {
  // Nested boxes (no intrinsic size) → base size falls back to rect height.
  function createBoxChild(height: number) {
    return createBoxWith({width: 5, height});
  }

  it('children with flexShrink compress to fit overflowing container', () => {
    const box = createBoxWith({width: 20, height: 4, direction: 'vertical', align: 'start'});
    const c1 = createBoxChild(3);
    c1.setFlexShrink(1);
    const c2 = createBoxChild(3);
    c2.setFlexShrink(1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // totalBase=6, mainSize=4, overflow=2; each shrinks by 1 → height 2
    expect(c1.rect.height).toBe(2);
    expect(c2.rect.height).toBe(2);
    expect(c2.rect.y).toBe(2);
  });

  it('flexShrink distributes proportionally by weight', () => {
    const box = createBoxWith({width: 20, height: 4, direction: 'vertical', align: 'start'});
    const c1 = createBoxChild(4);
    c1.setFlexShrink(3);
    const c2 = createBoxChild(4);
    c2.setFlexShrink(1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // overflow=4; totalShrink=4; c1 loses floor(3/4*4)=3 → 1; c2 loses floor(1/4*4)=1 → 3
    expect(c1.rect.height).toBe(1);
    expect(c2.rect.height).toBe(3);
  });

  it('children without flexShrink do not compress (overflow clipped)', () => {
    const box = createBoxWith({width: 20, height: 4, direction: 'vertical', align: 'start'});
    const c1 = createBoxChild(3);
    const c2 = createBoxChild(3);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.rect.height).toBe(3);
    expect(c2.rect.height).toBe(3);
    expect(c2.rect.y).toBe(3); // overflows past content area
  });

  it('flexShrink never shrinks a child below 0', () => {
    const box = createBoxWith({width: 20, height: 1, direction: 'vertical', align: 'start'});
    const c1 = createBoxChild(5);
    c1.setFlexShrink(1);
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // overflow=4; deduction=min(5,4)=4 → height 1
    expect(c1.rect.height).toBe(1);
  });

  it('flexShrink works on horizontal axis', () => {
    const box = createBoxWith({width: 4, height: 10, direction: 'horizontal', align: 'start'});
    const c1 = createBoxWith({width: 3, height: 5});
    c1.setFlexShrink(1);
    const c2 = createBoxWith({width: 3, height: 5});
    c2.setFlexShrink(1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // mainSize=4, totalBase=6, overflow=2; each shrinks by 1 → width 2
    expect(c1.rect.width).toBe(2);
    expect(c2.rect.width).toBe(2);
    expect(c2.rect.x).toBe(2);
  });

  it('flexShrink default is 0', () => {
    const c = createChild('x', 5, 1);
    expect(c.flexShrink).toBe(0);
  });
});

describe('flexBasis (per-child base size hint)', () => {
  it('numeric flexBasis sets child main-axis base size', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'start'});
    const c1 = createChild('a', 5, 1); // intrinsic height 1
    c1.setFlexBasis(4);
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.rect.height).toBe(4);
  });

  it('percent flexBasis resolves against container main size', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'start'});
    const c1 = createChild('a', 5, 1);
    c1.setFlexBasis('50%');
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.rect.height).toBe(5); // 50% of content height 10
  });

  it('flexBasis overrides intrinsic size in flexGrow distribution', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'stretch'});
    const c1 = createChild('a', 5, 1); // intrinsic height 1
    c1.setFlexBasis(2);
    c1.setFlexGrow(1);
    const c2 = createChild('b', 5, 1); // intrinsic height 1
    c2.setFlexGrow(1);
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // baseSizes: c1=2 (basis), c2=1 (intrinsic). totalBase=3, freeSpace=7.
    // grow: each floor(1/2*7)=3 → c1=5, c2=4; remainder 1 → c2=5
    expect(c1.rect.height).toBe(5);
    expect(c2.rect.height).toBe(5);
    expect(c2.rect.y).toBe(5);
  });

  it('flexBasis works on horizontal axis', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', align: 'start'});
    const c1 = createChild('a', 5, 1); // intrinsic width 1
    c1.setFlexBasis(8);
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.rect.width).toBe(8);
  });

  it('flexBasis default undefined uses intrinsic/rect size', () => {
    const c = createChild('ab', 5, 1);
    expect(c.flexBasis).toBeUndefined();
  });
});

describe('alignSelf (per-child cross-axis override)', () => {
  it('alignSelf center overrides parent align start', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'start'});
    const c1 = createChild('ab', 5, 1); // intrinsic width 2
    c1.setAlignSelf('center');
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.rect.x).toBe(9); // floor((20-2)/2)
    expect(c1.rect.width).toBe(2);
  });

  it('alignSelf stretch overrides parent align start', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'start'});
    const c1 = createChild('ab', 5, 1);
    c1.setAlignSelf('stretch');
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.rect.x).toBe(0);
    expect(c1.rect.width).toBe(20);
  });

  it('alignSelf end overrides parent align start', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'start'});
    const c1 = createChild('ab', 5, 1); // intrinsic width 2
    c1.setAlignSelf('end');
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.rect.x).toBe(18); // 20 - 2
  });

  it('siblings mix alignSelf independently while others inherit parent align', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'start', gap: 0});
    const c1 = createChild('ab', 5, 1); // intrinsic width 2
    c1.setAlignSelf('end');
    const c2 = createChild('cd', 5, 1); // intrinsic width 2 — no alignSelf
    box.addChild(c1);
    box.addChild(c2);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.rect.x).toBe(18); // end
    expect(c2.rect.x).toBe(0); // inherited start
  });

  it('alignSelf default undefined inherits parent align', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'vertical', align: 'center'});
    const c1 = createChild('ab', 5, 1);
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.alignSelf).toBeUndefined();
    expect(c1.rect.x).toBe(9); // inherited center: floor((20-2)/2)
  });

  it('alignSelf works on horizontal layout (vertical cross axis)', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', align: 'start'});
    const c1 = createChild('ab', 5, 1); // intrinsic height 1
    c1.setAlignSelf('end');
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    expect(c1.rect.y).toBe(9); // 10 - 1
    expect(c1.rect.height).toBe(1);
  });
});

describe('flexWrap (multi-line layout)', () => {
  // Geometry: horizontal direction → main=x, cross=y. Box 20×10, no border/padding.
  function childWithBasis(label: string, basis: number) {
    const c = createChild(label, basis, 1);
    c.setFlexBasis(basis);
    return c;
  }

  it('children wrap to next line when overflowing main axis', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', flexWrap: 'wrap', align: 'start'});
    const c1 = childWithBasis('a', 8);
    const c2 = childWithBasis('b', 8);
    const c3 = childWithBasis('c', 8);
    box.addChild(c1);
    box.addChild(c2);
    box.addChild(c3);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // mainSize=20; line1: c1(8)+c2(8)=16 ≤20; adding c3(8): 16+8=24>20 → wrap
    // line1 [c1,c2] at crossPos 0; line2 [c3] at crossPos 1 (height 1 each)
    expect(c1.rect.x).toBe(0);
    expect(c2.rect.x).toBe(8);
    expect(c3.rect.x).toBe(0); // wrapped to start of line 2
    expect(c3.rect.y).toBe(1); // second line
  });

  it('nowrap keeps all children on one line (overflow clipped)', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', flexWrap: 'nowrap', align: 'start'});
    const c1 = childWithBasis('a', 8);
    const c2 = childWithBasis('b', 8);
    const c3 = childWithBasis('c', 8);
    box.addChild(c1);
    box.addChild(c2);
    box.addChild(c3);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // nowrap: all on one line, c3 overflows (x=16, beyond width 20)
    expect(c3.rect.x).toBe(16);
    expect(c3.rect.y).toBe(0);
  });

  it('each line independently distributes free space via flexGrow', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', flexWrap: 'wrap', align: 'stretch'});
    const c1 = childWithBasis('a', 8);
    c1.setFlexGrow(1);
    const c2 = childWithBasis('b', 8);
    c2.setFlexGrow(1);
    const c3 = childWithBasis('c', 8);
    c3.setFlexGrow(1);
    box.addChild(c1);
    box.addChild(c2);
    box.addChild(c3);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // line1: c1(8)+c2(8)=16, freeSpace=4, each grows by 2 → width 10
    // line2: c3(8), freeSpace=12, grows by 12 → width 20
    expect(c1.rect.width).toBe(10);
    expect(c2.rect.width).toBe(10);
    expect(c3.rect.width).toBe(20);
  });

  it('alignContent center centers the block of lines', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', flexWrap: 'wrap', align: 'start', alignContent: 'center'});
    const c1 = childWithBasis('a', 8);
    const c2 = childWithBasis('b', 8);
    const c3 = childWithBasis('c', 8);
    box.addChild(c1);
    box.addChild(c2);
    box.addChild(c3);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // 2 lines, each crossExtent 1. total=2. freeCrossSpace=10-2=8. startOffset=4
    // line1 at y=4, line2 at y=5
    expect(c1.rect.y).toBe(4);
    expect(c3.rect.y).toBe(5);
  });

  it('wrap-reverse reverses line order', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', flexWrap: 'wrap-reverse', align: 'start'});
    const c1 = childWithBasis('a', 8);
    const c2 = childWithBasis('b', 8);
    const c3 = childWithBasis('c', 8);
    box.addChild(c1);
    box.addChild(c2);
    box.addChild(c3);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // wrap-reverse: line2 (c3) comes first (y=0), line1 (c1,c2) comes second (y=1)
    expect(c3.rect.y).toBe(0);
    expect(c1.rect.y).toBe(1);
  });

  it('gap applies both within lines and between lines', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', flexWrap: 'wrap', gap: 1, align: 'start'});
    const c1 = childWithBasis('a', 8);
    const c2 = childWithBasis('b', 8);
    const c3 = childWithBasis('c', 8);
    box.addChild(c1);
    box.addChild(c2);
    box.addChild(c3);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // mainSize=20; line1: c1(8)+gap(1)+c2(8)=17 ≤20; adding c3: 17+1+8=26>20 → wrap
    // line1 [c1,c2]: c1 at x=0, c2 at x=9 (8+gap1)
    // line2 [c3] at crossPos: 1(crossExtent of line1) + gap(1) = 2
    expect(c2.rect.x).toBe(9); // 8 + gap(1)
    expect(c3.rect.y).toBe(2); // line1 height(1) + line gap(1)
  });

  it('flexWrap default is nowrap', () => {
    const box = createBoxWith({width: 20, height: 10, direction: 'horizontal', align: 'start'});
    const c1 = childWithBasis('a', 30);
    box.addChild(c1);
    const buf = new DrawListBuffer();
    buf.reset();
    box.emitDrawCommands(buf);
    // nowrap: single child wider than container stays on one line
    expect(c1.rect.width).toBe(30);
    expect(c1.rect.y).toBe(0);
  });
});
