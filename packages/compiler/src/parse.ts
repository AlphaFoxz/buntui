import {parse as vueParse, type SFCDescriptor} from '@vue/compiler-sfc';

export type SFCParseOptions = {
  filename?: string;
  sourceMap?: boolean;
};

/**
 * Parse a Vue SFC source string into a descriptor.
 * Wraps @vue/compiler-sfc's parse with project defaults.
 */
export function parse(source: string, options?: SFCParseOptions): SFCDescriptor {
  const {filename = 'anonymous.tui.vue'} = options ?? {};
  const result = vueParse(source, {
    filename,
    sourceMap: options?.sourceMap ?? false,
  });
  if (result.errors.length > 0) {
    throw new Error(`SFC parse error: ${result.errors.map(String).join(', ')}`);
  }

  return result.descriptor;
}

export {type SFCDescriptor} from '@vue/compiler-sfc';
