export type RawSourceMap = {
  version: number;
  file: string;
  sources: string[];
  sourceRoot?: string;
  sourcesContent?: string[];
  mappings: string;
  names: string[];
};

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VLQ_BASE_SHIFT = 5;
const VLQ_BASE = 1 << VLQ_BASE_SHIFT;
const VLQ_BASE_MASK = VLQ_BASE - 1;
const VLQ_CONTINUATION_BIT = VLQ_BASE;

const BASE64_MAP = new Map<string, number>();
for (let i = 0; i < BASE64.length; i++) {
  BASE64_MAP.set(BASE64[i]!, i);
}

function decodeVLQValues(encoded: string): number[] {
  const values: number[] = [];
  let pos = 0;
  while (pos < encoded.length) {
    let result = 0;
    let shift = 0;
    let continuation: boolean;
    do {
      const digit = BASE64_MAP.get(encoded[pos]!) ?? 0;
      pos++;
      continuation = (digit & VLQ_CONTINUATION_BIT) !== 0;
      result += (digit & VLQ_BASE_MASK) << shift;
      shift += VLQ_BASE_SHIFT;
    } while (continuation);

    const isNegative = (result & 1) === 1;
    result >>= 1;
    values.push(isNegative ? -result : result);
  }

  return values;
}

function encodeVLQ(value: number): string {
  const vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;
  let encoded = '';
  let remaining = vlq;
  do {
    let digit = remaining & VLQ_BASE_MASK;
    remaining >>>= VLQ_BASE_SHIFT;
    if (remaining > 0) {
      digit |= VLQ_CONTINUATION_BIT;
    }

    encoded += BASE64[digit]!;
  } while (remaining > 0);

  return encoded;
}

export function buildLineLookup(sourceMap: RawSourceMap): Map<number, number> {
  const result = new Map<number, number>();
  let srcLine = 0;
  const lines = sourceMap.mappings.split(';');
  for (const [genLine, line] of lines.entries()) {
    const segs = line;
    if (!segs) {
      continue;
    }

    for (const seg of segs.split(',')) {
      if (!seg) {
        continue;
      }

      const values = decodeVLQValues(seg);
      if (values.length >= 4) {
        srcLine += values[2]!;
        result.set(genLine, srcLine);
        break;
      }
    }
  }

  return result;
}

export function adjustSourceMapLines(
  sourceMap: RawSourceMap,
  lineAdjustFn: (tsLine: number) => number | undefined,
  vueSource?: string,
): RawSourceMap {
  const smLines = sourceMap.mappings.split(';');
  const adjustedLines: string[] = [];

  let decSrcIdx = 0;
  let decSrcLine = 0;
  let decSrcCol = 0;

  let encSrcIdx = 0;
  let encSrcLine = 0;
  let encSrcCol = 0;

  for (const smLine of smLines) {
    let decGenCol = 0;
    let encGenCol = 0;
    const segments: string[] = [];

    if (smLine) {
      for (const raw of smLine.split(',')) {
        if (!raw) {
          continue;
        }

        const values = decodeVLQValues(raw);
        if (values.length === 0) {
          continue;
        }

        const genCol = decGenCol + values[0]!;
        decGenCol = genCol;

        if (values.length < 4) {
          continue;
        }

        const srcIdx = decSrcIdx + values[1]!;
        const srcLine = decSrcLine + values[2]!;
        const srcCol = decSrcCol + values[3]!;
        decSrcIdx = srcIdx;
        decSrcLine = srcLine;
        decSrcCol = srcCol;

        const adjusted = lineAdjustFn(srcLine);
        if (adjusted === undefined) {
          continue;
        }

        segments.push(encodeVLQ(genCol - encGenCol)
          + encodeVLQ(srcIdx - encSrcIdx)
          + encodeVLQ(adjusted - encSrcLine)
          + encodeVLQ(srcCol - encSrcCol));
        encGenCol = genCol;
        encSrcIdx = srcIdx;
        encSrcLine = adjusted;
        encSrcCol = srcCol;
      }
    }

    adjustedLines.push(segments.join(','));
  }

  return {
    version: 3,
    file: sourceMap.file,
    sources: sourceMap.sources,
    ...(vueSource === undefined ? {} : {sourcesContent: [vueSource]}),
    names: sourceMap.names,
    mappings: adjustedLines.join(';'),
  };
}
