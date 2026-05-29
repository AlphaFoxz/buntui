import {it, expect, describe} from 'bun:test';
import {OverlayManager} from '../../../overlay/OverlayManager';
import {createModalWidget, ModalWidget} from '../ModalWidget';
import type {DrawListBuffer} from '../../../draw_list/DrawListBuffer';
import {TuiWidgetEntity} from '../../TuiWidgetEntity';

class StubChild extends TuiWidgetEntity {
  override emitDrawCommands(_buf: DrawListBuffer): void {}
}

type ModalHost = {
  mount(widget: TuiWidgetEntity): void;
  unmount(widget: TuiWidgetEntity): void;
  getOverlayManager(): OverlayManager;
};

function createStubHost(): ModalHost {
  const widgets = new Set<TuiWidgetEntity>();
  const manager = new OverlayManager();
  return {
    mount(widget: TuiWidgetEntity) {
      widgets.add(widget);
      widget.mounted();
    },
    unmount(widget: TuiWidgetEntity) {
      widgets.delete(widget);
      widget.unmounted();
    },
    getOverlayManager() {
      return manager;
    },
  };
}

function createDrawCapture(): {buf: DrawListBuffer; rects: Array<{x: number; y: number; width: number; height: number; bgRgba: number}>; pushClips: Array<{x: number; y: number; width: number; height: number}>; borders: Array<{x: number; y: number; width: number; height: number}>} {
  const rects: Array<{x: number; y: number; width: number; height: number; bgRgba: number}> = [];
  const pushClips: Array<{x: number; y: number; width: number; height: number}> = [];
  const borders: Array<{x: number; y: number; width: number; height: number}> = [];
  const buf = {
    drawRect: (opts: {x: number; y: number; width: number; height: number; bgRgba: number}) => {
      rects.push(opts);
    },
    drawBorder: (opts: {x: number; y: number; width: number; height: number}) => {
      borders.push(opts);
    },
    pushClip: (x: number, y: number, width: number, height: number) => {
      pushClips.push({x, y, width, height});
    },
    popClip: () => {},
    drawText: () => {},
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
  return {buf, rects, pushClips, borders};
}

describe('ModalWidget', () => {
  describe('createModalWidget', () => {
    it('creates a ModalWidget instance', () => {
      const modal = createModalWidget();
      expect(modal).toBeInstanceOf(ModalWidget);
    });

    it('uses default width and height', () => {
      const modal = createModalWidget();
      const {rect} = modal;
      expect(rect.width).toBe(40);
      expect(rect.height).toBe(10);
    });

    it('uses custom width and height', () => {
      const modal = createModalWidget({width: 60, height: 20});
      const {rect} = modal;
      expect(rect.width).toBe(60);
      expect(rect.height).toBe(20);
    });
  });

  describe('containsPoint', () => {
    it('returns false when not open', () => {
      const modal = createModalWidget();
      expect(modal.containsPoint(0, 0)).toBe(false);
    });

    it('returns true for any point when open', () => {
      const modal = createModalWidget();
      const host = createStubHost();
      modal.open(host);
      expect(modal.containsPoint(0, 0)).toBe(true);
      expect(modal.containsPoint(100, 50)).toBe(true);
      modal.close();
    });
  });

  describe('open / close', () => {
    it('isOpen reflects state', () => {
      const modal = createModalWidget();
      expect(modal.isOpen).toBe(false);
      const host = createStubHost();
      modal.open(host);
      expect(modal.isOpen).toBe(true);
      modal.close();
      expect(modal.isOpen).toBe(false);
    });

    it('open is idempotent', () => {
      const modal = createModalWidget();
      const host = createStubHost();
      modal.open(host);
      modal.open(host);
      expect(modal.isOpen).toBe(true);
      modal.close();
      expect(modal.isOpen).toBe(false);
    });

    it('close is idempotent', () => {
      const modal = createModalWidget();
      modal.close();
      modal.close();
      expect(modal.isOpen).toBe(false);
    });

    it('dispatches closed event on close', () => {
      const modal = createModalWidget();
      const host = createStubHost();
      modal.open(host);
      let closed = false;
      modal.on('closed', () => { closed = true; });
      modal.close();
      expect(closed).toBe(true);
    });

    it('sets portal=true via OverlayManager on open', () => {
      const modal = createModalWidget();
      const host = createStubHost();
      modal.open(host);
      expect(modal.portal).toBe(true);
      modal.close();
    });

    it('restores state on close', () => {
      const modal = createModalWidget();
      const host = createStubHost();
      modal.open(host);
      expect(modal.portal).toBe(true);
      modal.close();
      expect(modal.portal).toBe(false);
    });
  });

  describe('emitDrawCommands', () => {
    it('does nothing when not open', () => {
      const modal = createModalWidget();
      const {buf, rects} = createDrawCapture();
      modal.emitDrawCommands(buf);
      expect(rects).toHaveLength(0);
    });

    it('draws backdrop and content rect when open', () => {
      const modal = createModalWidget({width: 20, height: 5});
      const host = createStubHost();
      modal.open(host);
      const {buf, rects, pushClips, borders} = createDrawCapture();
      modal.emitDrawCommands(buf);
      expect(rects.length).toBeGreaterThanOrEqual(2);
      expect(borders).toHaveLength(1);
      expect(pushClips).toHaveLength(1);
      modal.close();
    });

    it('backdrop covers full terminal', () => {
      const modal = createModalWidget({width: 20, height: 5});
      const host = createStubHost();
      modal.open(host);
      const {buf, rects} = createDrawCapture();
      modal.emitDrawCommands(buf);
      const backdrop = rects[0]!;
      expect(backdrop.x).toBe(0);
      expect(backdrop.y).toBe(0);
      modal.close();
    });
  });

  describe('closeOnBackdrop', () => {
    it('closes on backdrop click by default', () => {
      const modal = createModalWidget({width: 20, height: 5});
      const host = createStubHost();
      modal.open(host);
      let closed = false;
      modal.on('closed', () => { closed = true; });
      modal.dispatch('click', {x: 50, y: 50});
      expect(closed).toBe(true);
    });

    it('does not close on content area click', () => {
      const modal = createModalWidget({width: 20, height: 5});
      const host = createStubHost();
      modal.open(host);
      let closed = false;
      modal.on('closed', () => { closed = true; });
      const {rect} = modal;
      modal.dispatch('click', {x: rect.x + 1, y: rect.y + 1});
      expect(closed).toBe(false);
      modal.close();
    });

    it('does not close on backdrop click when closeOnBackdrop is false', () => {
      const modal = createModalWidget({width: 20, height: 5, closeOnBackdrop: false});
      const host = createStubHost();
      modal.open(host);
      let closed = false;
      modal.on('closed', () => { closed = true; });
      modal.dispatch('click', {x: 0, y: 0});
      expect(closed).toBe(false);
      modal.close();
    });
  });

  describe('closeOnEscape', () => {
    it('closes on Escape by default', () => {
      const modal = createModalWidget();
      const host = createStubHost();
      modal.open(host);
      let closed = false;
      modal.on('closed', () => { closed = true; });
      modal.dispatch('key', {key: 'Escape'});
      expect(closed).toBe(true);
    });

    it('does not close on other keys', () => {
      const modal = createModalWidget();
      const host = createStubHost();
      modal.open(host);
      let closed = false;
      modal.on('closed', () => { closed = true; });
      modal.dispatch('key', {key: 'Enter'});
      expect(closed).toBe(false);
      modal.close();
    });

    it('does not close on Escape when closeOnEscape is false', () => {
      const modal = createModalWidget({closeOnEscape: false});
      const host = createStubHost();
      modal.open(host);
      let closed = false;
      modal.on('closed', () => { closed = true; });
      modal.dispatch('key', {key: 'Escape'});
      expect(closed).toBe(false);
      modal.close();
    });
  });

  describe('children', () => {
    it('renders children inside content area', () => {
      const modal = createModalWidget({width: 20, height: 5});
      const child = new StubChild();
      let childEmitted = false;
      child.emitDrawCommands = () => { childEmitted = true; };
      modal.addChild(child);
      const host = createStubHost();
      modal.open(host);
      const {buf} = createDrawCapture();
      modal.emitDrawCommands(buf);
      expect(childEmitted).toBe(true);
      modal.close();
    });
  });

  describe('event blocking', () => {
    it('containsPoint blocks all coordinates when open', () => {
      const modal = createModalWidget({width: 20, height: 5});
      const host = createStubHost();
      modal.open(host);
      expect(modal.containsPoint(0, 0)).toBe(true);
      expect(modal.containsPoint(999, 999)).toBe(true);
      expect(modal.containsPoint(-1, -1)).toBe(true);
      modal.close();
      expect(modal.containsPoint(0, 0)).toBe(false);
    });
  });

  describe('reopen after close', () => {
    it('Escape still closes after reopen', () => {
      const modal = createModalWidget();
      const host = createStubHost();
      modal.open(host);
      modal.close();
      modal.open(host);
      let closed = false;
      modal.on('closed', () => { closed = true; });
      modal.dispatch('key', {key: 'Escape'});
      expect(closed).toBe(true);
    });

    it('backdrop click still closes after reopen', () => {
      const modal = createModalWidget({width: 20, height: 5});
      const host = createStubHost();
      modal.open(host);
      modal.close();
      modal.open(host);
      let closed = false;
      modal.on('closed', () => { closed = true; });
      modal.dispatch('click', {x: 50, y: 50});
      expect(closed).toBe(true);
    });

    it('close() dispatches closed event after reopen', () => {
      const modal = createModalWidget();
      const host = createStubHost();
      modal.open(host);
      modal.close();
      modal.open(host);
      let closed = false;
      modal.on('closed', () => { closed = true; });
      modal.close();
      expect(closed).toBe(true);
    });
  });

  describe('reentrant close', () => {
    it('closed callback reopening modal does not corrupt state', () => {
      const host1 = createStubHost();
      const host2 = createStubHost();
      const modal = createModalWidget();
      modal.open(host1);

      let reopenCount = 0;
      modal.on('closed', () => {
        reopenCount++;
        if (reopenCount === 1) {
          modal.open(host2);
        }
      });

      modal.close();

      expect(modal.isOpen).toBe(true);
      expect(reopenCount).toBe(1);
      modal.close();
      expect(modal.isOpen).toBe(false);
    });
  });

  describe('backdrop color options', () => {
    it('uses custom backdropRgba in drawRect', () => {
      const modal = createModalWidget({width: 20, height: 5, backdropRgba: 0xFF_00_00_88});
      const host = createStubHost();
      modal.open(host);
      const {buf, rects} = createDrawCapture();
      modal.emitDrawCommands(buf);
      expect(rects[0]!.bgRgba).toBe(0xFF_00_00_88);
      modal.close();
    });

    it('uses default backdrop rgba when no color specified', () => {
      const modal = createModalWidget({width: 20, height: 5});
      const host = createStubHost();
      modal.open(host);
      const {buf, rects} = createDrawCapture();
      modal.emitDrawCommands(buf);
      expect(rects[0]!.bgRgba).toBe(0x00_00_00_AA);
      modal.close();
    });
  });

  describe('child event bubbling', () => {
    it('child click inside content does not trigger backdrop close', () => {
      const modal = createModalWidget({width: 20, height: 5});
      const child = new StubChild();
      child.emitDrawCommands = () => {};
      modal.addChild(child);
      const host = createStubHost();
      modal.open(host);
      let backdropClosed = false;
      modal.on('closed', () => { backdropClosed = true; });
      const {rect} = modal;
      child.dispatch('click', {x: rect.x + 1, y: rect.y + 1});
      expect(backdropClosed).toBe(false);
      modal.close();
    });
  });

  describe('rect centering with content larger than terminal', () => {
    it('clamps position to (0, 0) when content exceeds terminal', () => {
      const modal = createModalWidget({width: 200, height: 100});
      const {rect} = modal;
      expect(rect.x).toBe(0);
      expect(rect.y).toBe(0);
      expect(rect.width).toBe(200);
      expect(rect.height).toBe(100);
    });
  });
});
