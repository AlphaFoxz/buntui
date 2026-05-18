import {it, expect, describe} from 'bun:test';
import {onTick, onMounted, onUnmounted} from '../composables';
import {runSetup, getCurrentScene} from '../scene-context';
import {TuiScene} from '../../extern/app/TuiScene';

describe('onTick', () => {
  it('registers tick handler on scene', () => {
    const scene = new TuiScene();
    const received: number[] = [];
    runSetup(scene, () => {
      onTick(dt => { received.push(dt); });
    });
    scene.update(16);
    expect(received).toEqual([16]);
  });

  it('throws when called outside setup', () => {
    expect(() => onTick(() => {})).toThrow('onTick() must be called during scene setup()');
  });

  it('auto-cleanup via runSetup', () => {
    const scene = new TuiScene();
    let called = false;
    const cleanup = runSetup(scene, () => {
      onTick(() => { called = true; });
    });
    cleanup();
    scene.update(16);
    expect(called).toBe(false);
  });

  it('returns unsubscribe function', () => {
    const scene = new TuiScene();
    let count = 0;
    let unsub: () => void = () => {};
    runSetup(scene, () => {
      unsub = onTick(() => { count++; });
    });
    scene.update(16);
    expect(count).toBe(1);
    unsub();
    scene.update(16);
    expect(count).toBe(1);
  });

  it('no context after setup completes', () => {
    runSetup(new TuiScene(), () => {});
    expect(getCurrentScene()).toBeUndefined();
  });
});

describe('onMounted', () => {
  it('fires callback after setup completes', () => {
    const order: string[] = [];
    runSetup(new TuiScene(), () => {
      order.push('setup');
      onMounted(() => { order.push('mounted'); });
    });
    expect(order).toEqual(['setup', 'mounted']);
  });

  it('fires multiple callbacks in registration order', () => {
    const order: string[] = [];
    runSetup(new TuiScene(), () => {
      onMounted(() => { order.push('a'); });
      onMounted(() => { order.push('b'); });
    });
    expect(order).toEqual(['a', 'b']);
  });

  it('callback has no scene context', () => {
    let context: TuiScene | undefined = 'not-undefined';
    runSetup(new TuiScene(), () => {
      onMounted(() => { context = getCurrentScene(); });
    });
    expect(context).toBeUndefined();
  });
});

describe('onUnmounted', () => {
  it('fires callback when cleanup runs', () => {
    let called = false;
    const cleanup = runSetup(new TuiScene(), () => {
      onUnmounted(() => { called = true; });
    });
    expect(called).toBe(false);
    cleanup();
    expect(called).toBe(true);
  });

  it('fires multiple callbacks in registration order', () => {
    const order: string[] = [];
    const cleanup = runSetup(new TuiScene(), () => {
      onUnmounted(() => { order.push('a'); });
      onUnmounted(() => { order.push('b'); });
    });
    cleanup();
    expect(order).toEqual(['a', 'b']);
  });

  it('fires before direct cleanup return', () => {
    const order: string[] = [];
    const cleanup = runSetup(new TuiScene(), () => {
      onUnmounted(() => { order.push('unmounted'); });
      return () => { order.push('direct'); };
    });
    cleanup();
    expect(order).toEqual(['unmounted', 'direct']);
  });

  it('does not fire if cleanup is not called', () => {
    let called = false;
    runSetup(new TuiScene(), () => {
      onUnmounted(() => { called = true; });
    });
    expect(called).toBe(false);
  });
});
