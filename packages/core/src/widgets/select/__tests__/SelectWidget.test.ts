import {it, expect, describe} from 'bun:test';
import {createSelectWidget} from '../SelectWidget';

const MANY_OPTIONS = Array.from({length: 20}, (_, i) => ({
  value: `opt${i}`,
  label: `Option ${i}`,
}));

function mouseEvent(overrides: Partial<{
  x: number;
  y: number;
  button: number | undefined;
  buttons: number | undefined;
  isRelease: boolean;
}>): {x: number; y: number; button: number | undefined; buttons: number | undefined; isRelease: boolean; shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean} {
  return {
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    button: overrides.button ?? 0,
    buttons: overrides.buttons ?? undefined,
    isRelease: overrides.isRelease ?? false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
  };
}

const KEY_EVENT = {
  key: '',
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  repeat: false,
  charCode: 0,
};

describe('SelectWidget scrollbar mouse interaction', () => {
  function openSelect() {
    const select = createSelectWidget({
      x: 10,
      y: 5,
      width: 20,
      height: 1,
      options: MANY_OPTIONS,
      value: 'opt0',
    });
    select.focus();
    select.handleActiveKey({...KEY_EVENT, key: 'Enter'});
    expect(select.open).toBe(true);
    return select;
  }

  it('clicking scrollbar thumb keeps dropdown open', () => {
    const select = openSelect();
    select.dispatch('mousedown' as any, mouseEvent({x: 29, y: 6, button: 0}));
    expect(select.open).toBe(true);
  });

  it('clicking scrollbar track-above scrolls up without closing', () => {
    const select = openSelect();
    const scrollX = 10 + 20 - 1;
    const ddY = 5 + 1;

    select.dispatch('wheel' as any, {x: scrollX, y: ddY, wheelDeltaY: 10, button: undefined, buttons: undefined, isRelease: false});
    select.dispatch('mousedown' as any, mouseEvent({x: scrollX, y: ddY, button: 0}));
    expect(select.open).toBe(true);
  });

  it('clicking scrollbar track-below scrolls down without closing', () => {
    const select = openSelect();
    const scrollX = 10 + 20 - 1;
    const ddY = 5 + 1;

    select.dispatch('mousedown' as any, mouseEvent({x: scrollX, y: ddY + 7, button: 0}));
    expect(select.open).toBe(true);
  });

  it('clicking item in dropdown selects and closes', () => {
    const select = openSelect();
    select.dispatch('mousedown' as any, mouseEvent({x: 12, y: 6, button: 0}));
    expect(select.open).toBe(false);
  });

  it('thumb drag scrolls the dropdown', () => {
    const select = openSelect();
    const scrollX = 10 + 20 - 1;
    const ddY = 5 + 1;

    select.dispatch('mousedown' as any, mouseEvent({x: scrollX, y: ddY, button: 0}));
    expect(select.open).toBe(true);

    select.dispatch('mousemove' as any, mouseEvent({x: scrollX, y: ddY + 5, button: undefined, buttons: 1}));
    expect(select.open).toBe(true);

    select.dispatch('mouseup' as any, mouseEvent({x: scrollX, y: ddY + 5, button: 0, isRelease: true}));
    expect(select.open).toBe(true);
  });

  it('clicking non-scrollbar area closes and selects', () => {
    const select = openSelect();
    select.dispatch('mousedown' as any, mouseEvent({x: 15, y: 7, button: 0}));
    expect(select.open).toBe(false);
  });
});

describe('SelectWidget containsPoint with dropdown', () => {
  it('containsPoint covers trigger rect', () => {
    const select = createSelectWidget({
      x: 10, y: 5, width: 20, height: 1,
      options: MANY_OPTIONS, value: 'opt0',
    });
    expect(select.containsPoint(10, 5)).toBe(true);
    expect(select.containsPoint(29, 5)).toBe(true);
  });

  it('containsPoint returns false for dropdown area when closed', () => {
    const select = createSelectWidget({
      x: 10, y: 5, width: 20, height: 1,
      options: MANY_OPTIONS, value: 'opt0',
    });
    expect(select.containsPoint(10, 6)).toBe(false);
    expect(select.containsPoint(29, 13)).toBe(false);
  });

  it('containsPoint covers dropdown area when opened', () => {
    const select = createSelectWidget({
      x: 10, y: 5, width: 20, height: 1,
      options: MANY_OPTIONS, value: 'opt0',
    });
    select.focus();
    select.handleActiveKey({...KEY_EVENT, key: 'Enter'});
    expect(select.open).toBe(true);

    expect(select.containsPoint(10, 6)).toBe(true);
    expect(select.containsPoint(29, 6)).toBe(true);
    expect(select.containsPoint(29, 13)).toBe(true);
    expect(select.containsPoint(29, 14)).toBe(false);
    expect(select.containsPoint(9, 6)).toBe(false);
  });

  it('zIndex is 100 and portal is true when opened', () => {
    const select = createSelectWidget({
      x: 10, y: 5, width: 20, height: 1,
      options: MANY_OPTIONS, value: 'opt0',
    });
    expect(select.zIndex).toBe(0);
    expect(select.portal).toBe(false);
    select.focus();
    select.handleActiveKey({...KEY_EVENT, key: 'Enter'});
    expect(select.zIndex).toBe(100);
    expect(select.portal).toBe(true);
  });
});

describe('SelectWidget with TuiScene hitTest integration', () => {
  it('scene.hitTest finds SelectWidget in dropdown area when opened', async () => {
    const {TuiScene} = await import('../../../extern/app/TuiScene');
    const scene = new TuiScene({visible: true});

    const select = createSelectWidget({
      x: 10, y: 5, width: 20, height: 1,
      options: MANY_OPTIONS, value: 'opt0',
    });
    scene.mount(select);
    select.focus();
    select.handleActiveKey({...KEY_EVENT, key: 'Enter'});

    expect(scene.hitTest(mouseEvent({x: 29, y: 6}))).toBe(select);
    expect(scene.hitTest(mouseEvent({x: 29, y: 13}))).toBe(select);
    expect(scene.hitTest(mouseEvent({x: 29, y: 14}))).toBeUndefined();
  });

  it('scene.hitTest prefers opened SelectWidget over overlapping widgets', async () => {
    const {TuiScene} = await import('../../../extern/app/TuiScene');
    const {createBox} = await import('../../box/BoxWidget');

    const scene = new TuiScene({visible: true});

    const select = createSelectWidget({
      x: 76, y: 8, width: 22, height: 1,
      options: MANY_OPTIONS, value: 'opt0',
    });
    const box = createBox({x: 1, y: 14, width: 95, height: 3});
    scene.mount(select);
    scene.mount(box);

    expect(scene.hitTest(mouseEvent({x: 80, y: 14}))).toBe(box);

    select.focus();
    select.handleActiveKey({...KEY_EVENT, key: 'Enter'});

    expect(scene.hitTest(mouseEvent({x: 80, y: 14}))).toBe(select);
    expect(scene.hitTest(mouseEvent({x: 97, y: 14}))).toBe(select);
    expect(scene.hitTest(mouseEvent({x: 97, y: 16}))).toBe(select);
    expect(scene.hitTest(mouseEvent({x: 97, y: 17}))).toBeUndefined();
  });

  it('sets portal=true on open and portal=false on close', async () => {
    const {TuiScene} = await import('../../../extern/app/TuiScene');

    const scene = new TuiScene({visible: true});
    const select = createSelectWidget({
      x: 10, y: 5, width: 20, height: 1,
      options: MANY_OPTIONS, value: 'opt0',
    });
    scene.mount(select);

    expect(select.portal).toBe(false);
    select.focus();
    select.handleActiveKey({...KEY_EVENT, key: 'Enter'});
    expect(select.portal).toBe(true);

    select.handleActiveKey({...KEY_EVENT, key: 'Escape'});
    expect(select.portal).toBe(false);
  });

  it('restores zIndex after close', async () => {
    const {TuiScene} = await import('../../../extern/app/TuiScene');

    const scene = new TuiScene({visible: true});
    const select = createSelectWidget({
      x: 10, y: 5, width: 20, height: 1,
      options: MANY_OPTIONS, value: 'opt0',
    });
    scene.mount(select);

    expect(select.zIndex).toBe(0);
    select.focus();
    select.handleActiveKey({...KEY_EVENT, key: 'Enter'});
    expect(select.zIndex).toBe(100);
    select.handleActiveKey({...KEY_EVENT, key: 'Escape'});
    expect(select.zIndex).toBe(0);
  });

  it('preserves preset zIndex after open/close cycle', async () => {
    const {TuiScene} = await import('../../../extern/app/TuiScene');

    const scene = new TuiScene({visible: true});
    const select = createSelectWidget({
      x: 10, y: 5, width: 20, height: 1,
      options: MANY_OPTIONS, value: 'opt0',
    });
    select.setZIndex(50);
    scene.mount(select);

    expect(select.zIndex).toBe(50);
    select.focus();
    select.handleActiveKey({...KEY_EVENT, key: 'Enter'});
    expect(select.zIndex).toBe(100);
    select.handleActiveKey({...KEY_EVENT, key: 'Escape'});
    expect(select.zIndex).toBe(50);
  });
});
