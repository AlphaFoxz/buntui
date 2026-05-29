import {it, expect, describe, beforeEach} from 'bun:test';
import {OverlayManager} from '../OverlayManager';
import type {OverlayHandle} from '../types';
import type {DrawListBuffer} from '../../draw_list/DrawListBuffer';
import {TuiWidgetEntity} from '../../widgets/TuiWidgetEntity';

class StubWidget extends TuiWidgetEntity {
  _zIndex = 0;
  emitCommandsCalled = false;
  override emitDrawCommands(_buf: DrawListBuffer): void {
    this.emitCommandsCalled = true;
  }

  override get rect() {
    return this._rect;
  }

  override updateRect(rect: Partial<{x: U16; y: U16; width: U16; height: U16}>): void {
    Object.assign(this._rect, rect);
  }

  _rect: {x: number; y: number; width: number; height: number} = {x: 0, y: 0, width: 10, height: 5};
}

describe('OverlayManager', () => {
  let manager: OverlayManager;

  beforeEach(() => {
    manager = new OverlayManager();
  });

  describe('open / close lifecycle', () => {
    it('open returns handle with widget', () => {
      const widget = new StubWidget();
      const handle = manager.open(widget);
      expect(handle.widget).toBe(widget);
    });

    it('open sets portal=true on widget', () => {
      const widget = new StubWidget();
      manager.open(widget);
      expect(widget.portal).toBe(true);
    });

    it('open assigns incrementing zIndex starting from 100', () => {
      const w1 = new StubWidget();
      const w2 = new StubWidget();
      manager.open(w1);
      manager.open(w2);
      expect(w1.zIndex).toBe(100);
      expect(w2.zIndex).toBe(101);
    });

    it('close restores portal and zIndex', () => {
      const widget = new StubWidget();
      widget._zIndex = 5;
      widget.setZIndex(5);
      const handle = manager.open(widget);
      expect(widget.portal).toBe(true);
      expect(widget.zIndex).toBe(100);
      handle.close();
      expect(widget.portal).toBe(false);
      expect(widget.zIndex).toBe(5);
    });

    it('close via manager.close(handle)', () => {
      const widget = new StubWidget();
      const handle = manager.open(widget);
      manager.close(handle);
      expect(widget.portal).toBe(false);
    });

    it('close is idempotent', () => {
      const widget = new StubWidget();
      const handle = manager.open(widget);
      handle.close();
      handle.close();
      expect(widget.portal).toBe(false);
    });

    it('getTopOverlay returns the most recently opened widget', () => {
      const w1 = new StubWidget();
      const w2 = new StubWidget();
      manager.open(w1);
      manager.open(w2);
      expect(manager.getTopOverlay()).toBe(w2);
    });

    it('getTopOverlay returns undefined when stack is empty', () => {
      expect(manager.getTopOverlay()).toBeUndefined();
    });

    it('getTopOverlay updates after close', () => {
      const w1 = new StubWidget();
      const w2 = new StubWidget();
      const h2 = manager.open(w2);
      manager.open(w1);
      expect(manager.getTopOverlay()).toBe(w1);
      h2.close();
      expect(manager.getTopOverlay()).toBe(w1);
    });
  });

  describe('closeAll', () => {
    it('closes all overlays', () => {
      const w1 = new StubWidget();
      const w2 = new StubWidget();
      manager.open(w1);
      manager.open(w2);
      manager.closeAll();
      expect(w1.portal).toBe(false);
      expect(w2.portal).toBe(false);
      expect(manager.getTopOverlay()).toBeUndefined();
    });

    it('does nothing when stack is empty', () => {
      expect(() => manager.closeAll()).not.toThrow();
    });
  });

  describe('onClosed callback', () => {
    it('fires onClosed when handle is closed', () => {
      const widget = new StubWidget();
      const handle = manager.open(widget);
      let closed = false;
      handle.onClosed(() => { closed = true; });
      handle.close();
      expect(closed).toBe(true);
    });

    it('fires multiple onClosed callbacks', () => {
      const widget = new StubWidget();
      const handle = manager.open(widget);
      let count = 0;
      handle.onClosed(() => { count++; });
      handle.onClosed(() => { count++; });
      handle.close();
      expect(count).toBe(2);
    });

    it('onClosed fires immediately if already closed', () => {
      const widget = new StubWidget();
      const handle = manager.open(widget);
      handle.close();
      let closed = false;
      handle.onClosed(() => { closed = true; });
      expect(closed).toBe(true);
    });
  });

  describe('multiple overlapping overlays (z-order)', () => {
    it('zIndex increments for each overlay', () => {
      const widgets = Array.from({length: 5}, () => new StubWidget());
      for (const w of widgets) {
        manager.open(w);
      }

      for (let i = 0; i < 5; i++) {
        expect(widgets[i]!.zIndex).toBe(100 + i);
      }
    });

    it('closing middle overlay does not affect others zIndex', () => {
      const w1 = new StubWidget();
      const w2 = new StubWidget();
      const w3 = new StubWidget();
      const h1 = manager.open(w1);
      const h2 = manager.open(w2);
      manager.open(w3);

      h2.close();
      expect(w1.zIndex).toBe(100);
      expect(w2.zIndex).toBe(w2._zIndex);
      expect(w3.zIndex).toBe(102);
      h1.close();
      expect(w3.zIndex).toBe(102);
    });
  });

  describe('custom baseZIndex', () => {
    it('uses custom base zIndex', () => {
      const customManager = new OverlayManager({baseZIndex: 200});
      const widget = new StubWidget();
      customManager.open(widget);
      expect(widget.zIndex).toBe(200);
    });
  });

  describe('backdrop', () => {
    function drawBackdrops(mgr: OverlayManager): Array<{bgRgba: number; zIndex: number}> {
      const entries = mgr.getBackdropEntries();
      const result: Array<{bgRgba: number; zIndex: number}> = [];
      const buf = {
        drawRect: (opts: {bgRgba: number}) => { result.push({bgRgba: opts.bgRgba, zIndex: 0}); },
      } as unknown as DrawListBuffer;
      for (const entry of entries) {
        entry.draw(buf);
      }

      for (let i = 0; i < result.length; i++) {
        result[i]!.zIndex = entries[i]!.zIndex;
      }

      return result;
    }

    it('returns no entries without backdrop overlays', () => {
      const widget = new StubWidget();
      manager.open(widget);
      expect(drawBackdrops(manager)).toHaveLength(0);
    });

    it('returns entries for backdrop overlays', () => {
      const widget = new StubWidget();
      manager.open(widget, {backdrop: true});
      const result = drawBackdrops(manager);
      expect(result).toHaveLength(1);
      expect(result[0]!.bgRgba).toBe(0x00_00_00_AA);
    });

    it('uses custom backdropRgba per overlay', () => {
      const widget = new StubWidget();
      manager.open(widget, {backdrop: true, backdropRgba: 0xFF_00_00_88});
      const result = drawBackdrops(manager);
      expect(result[0]!.bgRgba).toBe(0xFF_00_00_88);
    });

    it('uses default backdropRgba from constructor', () => {
      const customManager = new OverlayManager({backdropRgba: 0xFF_FF_FF_44});
      const widget = new StubWidget();
      customManager.open(widget, {backdrop: true});
      const result = drawBackdrops(customManager);
      expect(result[0]!.bgRgba).toBe(0xFF_FF_FF_44);
    });

    it('does not return backdrop after close', () => {
      const widget = new StubWidget();
      const handle = manager.open(widget, {backdrop: true});
      handle.close();
      expect(drawBackdrops(manager)).toHaveLength(0);
    });

    it('backdrop zIndex matches overlay zIndex', () => {
      const w1 = new StubWidget();
      const w2 = new StubWidget();
      manager.open(w1, {backdrop: true});
      manager.open(w2, {backdrop: true});
      const result = drawBackdrops(manager);
      expect(result[0]!.zIndex).toBe(100);
      expect(result[1]!.zIndex).toBe(101);
    });
  });
});
