import {describe, it, expect} from 'bun:test';
import {compile} from '../compile';

describe('source map', () => {
  it('maps user script body lines back to .vue file', () => {
    const source = `<template>
    <Box/>
</template>

<script setup lang="ts">
import {ref} from '@vue/reactivity'

const count = ref(0)
asdasd
setTimeout(() => {
    console.log('hello')
}, 1000)
</script>`;

    const result = compile(source, {
      filename: 'test.vue',
      sourceMap: true,
    });

    expect(result.sourceMap).toBeDefined();
    expect(result.sourceMap!.sources).toContain('test.vue');
    expect(result.sourceMap!.sourcesContent).toBeDefined();
    expect(result.sourceMap!.sourcesContent![0]).toBe(source);

    const jsLines = result.code.split('\n');
    const asdasdJsLine = jsLines.findIndex(l => l.includes('asdasd'));
    expect(asdasdJsLine).toBeGreaterThanOrEqual(0);

    const mappings = decodeSourceMap(result.sourceMap!);
    const mapping = mappings[asdasdJsLine]?.[0];
    expect(mapping).toBeDefined();
    // .vue line 9 (1-indexed): "asdasd" → 0-indexed = 8
    expect(mapping!.srcLine).toBe(8);
  });

  it('maps multiple body lines with correct offsets', () => {
    const source = `<template><Box/></template>
<script setup>
const a = 1
const b = 2
const c = 3
</script>`;

    const result = compile(source, {
      filename: 'multi.vue',
      sourceMap: true,
    });

    const jsLines = result.code.split('\n');
    const mappings = decodeSourceMap(result.sourceMap!);

    const aLine = jsLines.findIndex(l => l.includes('const a = 1'));
    const bLine = jsLines.findIndex(l => l.includes('const b = 2'));
    const cLine = jsLines.findIndex(l => l.includes('const c = 3'));

    // .vue line 3 (a), 4 (b), 5 (c) → 0-indexed: 2, 3, 4
    expect(mappings[aLine]?.[0]?.srcLine).toBe(2);
    expect(mappings[bLine]?.[0]?.srcLine).toBe(3);
    expect(mappings[cLine]?.[0]?.srcLine).toBe(4);
  });

  it('does not generate source map when sourceMap is false', () => {
    const result = compile('<template><Box/></template>', {
      filename: 'test.vue',
    });
    expect(result.sourceMap).toBeUndefined();
  });

  it('includes sourcesContent from original .vue source', () => {
    const source = '<template><Text :value="msg"/></template><script setup>const msg = "hi"</script>';
    const result = compile(source, {filename: 'test.vue', sourceMap: true});
    expect(result.sourceMap!.sourcesContent).toBeDefined();
    expect(result.sourceMap!.sourcesContent![0]).toBe(source);
  });
});

type Mapping = {genCol: number; srcLine: number; srcCol: number};

function decodeSourceMap(sm: {mappings: string}): Mapping[][] {
  const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bmap = new Map<string, number>();
  for (let i = 0; i < BASE64.length; i++) bmap.set(BASE64[i]!, i);

  function decodeVLQ(s: string): number[] {
    const vals: number[] = [];
    let pos = 0;
    while (pos < s.length) {
      let r = 0, shift = 0, cont: boolean;
      do {
        const d = bmap.get(s[pos]!) ?? 0;
        pos++;
        cont = (d & 32) !== 0;
        r += (d & 31) << shift;
        shift += 5;
      } while (cont);
      const neg = (r & 1) === 1;
      r >>= 1;
      vals.push(neg ? -r : r);
    }
    return vals;
  }

  const result: Mapping[][] = [];
  let srcLine = 0;
  let srcCol = 0;
  let genCol = 0;

  for (const line of sm.mappings.split(';')) {
    const segments: Mapping[] = [];
    genCol = 0;
    if (line) {
      for (const seg of line.split(',')) {
        if (!seg) continue;
        const vals = decodeVLQ(seg);
        if (vals.length < 4) continue;
        genCol += vals[0]!;
        srcLine += vals[2]!;
        srcCol += vals[3]!;
        segments.push({genCol, srcLine, srcCol});
      }
    }

    result.push(segments);
  }

  return result;
}
