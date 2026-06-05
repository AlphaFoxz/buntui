/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
export type Scheduler = {
  schedule(fn: () => void): unknown;
  cancel(handle: unknown): void;
};

export type TickHandle = ReturnType<typeof setImmediate>;

const _setImmediate = (() => {
  if (typeof setImmediate === 'function') {
    return setImmediate;
  }

  return (fn: (...args: unknown[]) => void) => setTimeout(fn, 0) as unknown as TickHandle;
})();

const _clearImmediate = (() => {
  if (typeof clearImmediate === 'function') {
    return clearImmediate;
  }

  return (id?: any) => {
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
  };
})();

export const immediateScheduler: Scheduler = {
  schedule: (fn: () => void) => _setImmediate(fn),
  cancel(id: any) {
    _clearImmediate(id as TickHandle);
  },
};

declare const requestAnimationFrame: undefined | ((cb: (time: number) => void) => number);
declare const cancelAnimationFrame: undefined | ((id: number) => void);

const _requestAnimationFrame = (() => {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame;
  }

  return (fn: (...args: unknown[]) => void) => setTimeout(fn, 0) as unknown as number;
})();

const _cancelAnimationFrame = (() => {
  if (typeof cancelAnimationFrame === 'function') {
    return cancelAnimationFrame;
  }

  return (id?: any) => {
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
  };
})();

export const animationFrameScheduler: Scheduler = {
  schedule: (fn: () => void) => _requestAnimationFrame(fn),
  cancel(id: any) {
    _cancelAnimationFrame(id as number);
  },
};

export const nextTick = _setImmediate as (fn: (...args: unknown[]) => void) => TickHandle;
export const cancelTick = _clearImmediate as (id?: TickHandle) => void;
