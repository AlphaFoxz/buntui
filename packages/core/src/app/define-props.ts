import {reactive} from '@vue/reactivity';
import {getCurrentProps} from './scene-context';

type PropConfig = {
  type?: unknown;
  required?: boolean;
  default?: unknown;
};

type PropsOptions = Record<string, PropConfig | unknown>;

function resolveDefault(config: unknown): unknown {
  if (config === null || config === undefined || typeof config !== 'object') {
    return undefined;
  }

  const propConfig = config as PropConfig;
  if (!('default' in propConfig)) {
    return undefined;
  }

  const def = propConfig.default;
  return typeof def === 'function' ? (def as () => unknown)() : def;
}

function extractDefaults(options?: PropsOptions): Record<string, unknown> {
  if (!options) {
    return {};
  }

  const defaults: Record<string, unknown> = {};
  for (const [key, config] of Object.entries(options)) {
    defaults[key] = resolveDefault(config);
  }

  return defaults;
}

export function defineProps(options?: PropsOptions): Record<string, unknown> {
  const parentProps = getCurrentProps();

  if (!parentProps) {
    return reactive(extractDefaults(options));
  }

  if (options) {
    for (const [key, config] of Object.entries(options)) {
      if (parentProps[key] === undefined) {
        parentProps[key] = resolveDefault(config);
      }
    }
  }

  return reactive(parentProps);
}
