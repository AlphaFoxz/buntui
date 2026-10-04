import {getCurrentEmits, type EmitHandlers} from './scene-context';

export type EmitFn = (event: string, ...args: unknown[]) => void;

export function defineEmits(_events?: string[]): EmitFn {
  const emits: EmitHandlers | undefined = getCurrentEmits();
  return (event: string, ...args: unknown[]) => {
    emits?.[event]?.(...args);
  };
}
