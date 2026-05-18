import {it, expect, describe} from 'bun:test';
import {runSetup, setCurrentScene, getCurrentScene, trackInScope, trackMounted} from '../scene-context';
import {TuiScene} from '../../extern/app/TuiScene';

describe('setCurrentScene / getCurrentScene', () => {
  it('returns undefined by default', () => {
    expect(getCurrentScene()).toBeUndefined();
  });

  it('returns scene after setCurrentScene', () => {
    const scene = new TuiScene();
    setCurrentScene(scene);
    expect(getCurrentScene()).toBe(scene);
    setCurrentScene(undefined);
  });

  it('returns undefined after clearing', () => {
    const scene = new TuiScene();
    setCurrentScene(scene);
    setCurrentScene(undefined);
    expect(getCurrentScene()).toBeUndefined();
  });
});

describe('trackInScope', () => {
  it('tracks cleanup in current scope', () => {
    const cleanups: string[] = [];
    runSetup(new TuiScene(), () => {
      trackInScope(() => { cleanups.push('a'); });
      trackInScope(() => { cleanups.push('b'); });
    })();
    expect(cleanups).toEqual(['a', 'b']);
  });

  it('does nothing outside of runSetup', () => {
    setCurrentScene(undefined);
    trackInScope(() => {});
  });
});

describe('runSetup', () => {
  it('sets scene context during setup', () => {
    let captured: TuiScene | undefined;
    const scene = new TuiScene();
    runSetup(scene, () => {
      captured = getCurrentScene();
    });
    expect(captured).toBe(scene);
  });

  it('clears scene context after setup', () => {
    runSetup(new TuiScene(), () => {});
    expect(getCurrentScene()).toBeUndefined();
  });

  it('returns combined cleanup function', () => {
    const cleanups: string[] = [];
    const cleanup = runSetup(new TuiScene(), () => {
      trackInScope(() => { cleanups.push('scope1'); });
      trackInScope(() => { cleanups.push('scope2'); });
      return () => { cleanups.push('direct'); };
    });
    cleanup();
    expect(cleanups).toEqual(['scope1', 'scope2', 'direct']);
  });

  it('cleans up scope before direct cleanup', () => {
    const order: string[] = [];
    const cleanup = runSetup(new TuiScene(), () => {
      trackInScope(() => { order.push('scope'); });
      return () => { order.push('direct'); };
    });
    cleanup();
    expect(order).toEqual(['scope', 'direct']);
  });

  it('works when setup returns void', () => {
    const cleanups: string[] = [];
    const cleanup = runSetup(new TuiScene(), () => {
      trackInScope(() => { cleanups.push('a'); });
    });
    cleanup();
    expect(cleanups).toEqual(['a']);
  });

  it('leaks context if setup throws (no try/finally guard)', () => {
    const scene = new TuiScene();
    try {
      runSetup(scene, () => {
        throw new Error('test');
      });
    } catch {}
    expect(getCurrentScene()).toBe(scene);
    setCurrentScene(undefined);
  });

  it('flushes mounted callbacks after setup completes', () => {
    const order: string[] = [];
    runSetup(new TuiScene(), () => {
      order.push('setup');
      trackMounted(() => { order.push('mounted'); });
    });
    expect(order).toEqual(['setup', 'mounted']);
  });

  it('flushes multiple mounted callbacks in order', () => {
    const order: string[] = [];
    runSetup(new TuiScene(), () => {
      trackMounted(() => { order.push('m1'); });
      trackMounted(() => { order.push('m2'); });
    });
    expect(order).toEqual(['m1', 'm2']);
  });

  it('mounted callbacks run after context is cleared', () => {
    let contextDuringMounted: TuiScene | undefined = 'not-undefined';
    runSetup(new TuiScene(), () => {
      trackMounted(() => { contextDuringMounted = getCurrentScene(); });
    });
    expect(contextDuringMounted).toBeUndefined();
  });
});
