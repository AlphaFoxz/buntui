import {it, expect, describe} from 'bun:test';
import {TuiContext, TuiResizeBehavior, TUI_CONTEXT_INSTANCE} from '../TuiContext';

describe('TuiContext', () => {
  it('creates with default values', () => {
    const ctx = new TuiContext();
    expect(ctx.tick).toBe(0n);
    expect(ctx.x).toBe(0);
    expect(ctx.y).toBe(0);
    expect(ctx.rows).toBe(0);
    expect(ctx.cols).toBe(0);
    expect(ctx.resizeBehavior).toBe(TuiResizeBehavior.Auto);
    expect(ctx.debugMode).toBe(false);
  });

  it('has a valid pointer', () => {
    const ctx = new TuiContext();
    expect(ctx.ptr).toBeDefined();
    expect(typeof ctx.ptr).toBe('number');
  });

  it('sets and gets x', () => {
    const ctx = new TuiContext();
    ctx.x = 100;
    expect(ctx.x).toBe(100);
  });

  it('sets and gets y', () => {
    const ctx = new TuiContext();
    ctx.y = 200;
    expect(ctx.y).toBe(200);
  });

  it('sets and gets rows', () => {
    const ctx = new TuiContext();
    ctx.rows = 50;
    expect(ctx.rows).toBe(50);
  });

  it('sets and gets cols', () => {
    const ctx = new TuiContext();
    ctx.cols = 120;
    expect(ctx.cols).toBe(120);
  });

  it('sets and gets resizeBehavior to Fixed', () => {
    const ctx = new TuiContext();
    ctx.resizeBehavior = TuiResizeBehavior.Fixed;
    expect(ctx.resizeBehavior).toBe(TuiResizeBehavior.Fixed);
  });

  it('sets and gets debugMode', () => {
    const ctx = new TuiContext();
    ctx.debugMode = true;
    expect(ctx.debugMode).toBe(true);
    ctx.debugMode = false;
    expect(ctx.debugMode).toBe(false);
  });

  it('each instance has independent state', () => {
    const ctx1 = new TuiContext();
    const ctx2 = new TuiContext();
    ctx1.x = 10;
    ctx2.x = 20;
    expect(ctx1.x).toBe(10);
    expect(ctx2.x).toBe(20);
  });
});

describe('TUI_CONTEXT_INSTANCE', () => {
  it('is a TuiContext instance', () => {
    expect(TUI_CONTEXT_INSTANCE).toBeInstanceOf(TuiContext);
  });

  it('is a singleton (same reference)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../TuiContext');
    expect(mod.TUI_CONTEXT_INSTANCE).toBe(TUI_CONTEXT_INSTANCE);
  });
});

describe('TuiResizeBehavior', () => {
  it('has Fixed = 0', () => {
    expect(TuiResizeBehavior.Fixed).toBe(0);
  });

  it('has Auto = 1', () => {
    expect(TuiResizeBehavior.Auto).toBe(1);
  });
});
