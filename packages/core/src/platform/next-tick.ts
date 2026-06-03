export type TickHandle = ReturnType<typeof setImmediate>;

const _setImmediate
  = typeof setImmediate === 'function'
    ? setImmediate
    : (fn: (...args: unknown[]) => void) => setTimeout(fn, 0) as unknown as TickHandle;

const _clearImmediate
  = typeof clearImmediate === 'function'
    ? clearImmediate
    : (id?: any) => {
      clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
    };

export const nextTick = _setImmediate as (fn: (...args: unknown[]) => void) => TickHandle;
export const cancelTick = _clearImmediate as (id?: TickHandle) => void;
