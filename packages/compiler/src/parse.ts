import {parse as vueParse, type SFCDescriptor} from '@vue/compiler-sfc';

export type SFCParseOptions = {
  filename?: string;
  sourceMap?: boolean;
};

function formatParseError(error: unknown, filename: string): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const {message, loc} = error as {message?: string; loc?: {start?: {line: number; column: number}}};
  if (loc?.start) {
    return `${filename}:${loc.start.line}:${loc.start.column} - ${message ?? ''}`;
  }

  return `${filename} - ${String(error)}`;
}

export function parse(source: string, options?: SFCParseOptions): SFCDescriptor {
  const {filename = 'anonymous.tui.vue'} = options ?? {};
  const result = vueParse(source, {
    filename,
    sourceMap: options?.sourceMap ?? false,
  });

  if (result.errors.length > 0) {
    const formatted = result.errors.map(error => formatParseError(error, filename)).join('\n');
    throw new Error(`SFC parse error:\n${formatted}`);
  }

  return result.descriptor;
}

export {type SFCDescriptor} from '@vue/compiler-sfc';
