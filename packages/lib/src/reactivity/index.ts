import {type Ref, customRef} from '@vue/reactivity';

type TuiRef<T = any, S = T> = {
  // Close(): void;
} & Ref<T, S>;

export function ref<T>(value: T): TuiRef<T, T> {
  const innerRef = customRef((track, trigger) => ({
    get() {
      track();
      return value;
    },
    set(newValue) {
      value = newValue;
      trigger();
    },
  }));
  return innerRef;
}

