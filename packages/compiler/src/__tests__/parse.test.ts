import {describe, it, expect} from 'bun:test';
import {parse} from '../parse';

describe('parse', () => {
  describe('basic parsing', () => {
    it('parses minimal SFC with template only', () => {
      const desc = parse('<template><div/></template>');
      expect(desc.template).toBeDefined();
      expect(desc.template!.content).toContain('div');
    });

    it('parses SFC with script setup', () => {
      const desc = parse(
        '<template><Box/></template><script setup lang="ts">const x = 1</script>',
      );
      expect(desc.template).toBeDefined();
      expect(desc.scriptSetup).toBeDefined();
      expect(desc.scriptSetup!.content).toBe('const x = 1');
      expect(desc.scriptSetup!.lang).toBe('ts');
    });

    it('parses SFC with regular script block', () => {
      const desc = parse(
        '<template><Box/></template><script>export const x = 1</script>',
      );
      expect(desc.script).toBeDefined();
      expect(desc.script!.content).toBe('export const x = 1');
    });

    it('returns both template and scriptSetup', () => {
      const desc = parse(
        '<template><Box/></template><script setup>const msg = "hi"</script>',
      );
      expect(desc.template).toBeDefined();
      expect(desc.scriptSetup).toBeDefined();
      expect(desc.script).toBeNull();
    });
  });

  describe('descriptor fields', () => {
    it('returns filename from options', () => {
      const desc = parse('<template><Box/></template>', {filename: 'Test.vue'});
      expect(desc.filename).toBe('Test.vue');
    });

    it('uses default filename when not provided', () => {
      const desc = parse('<template><Box/></template>');
      expect(desc.filename).toBe('anonymous.tui.vue');
    });

    it('returns empty styles array when no style block', () => {
      const desc = parse('<template><Box/></template>');
      expect(desc.styles).toHaveLength(0);
    });

    it('returns empty customBlocks array', () => {
      const desc = parse('<template><Box/></template>');
      expect(desc.customBlocks).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('throws on malformed SFC', () => {
      expect(() => parse('<template><Box')).toThrow('SFC parse error');
    });

    it('throws on invalid tag nesting', () => {
      expect(() => parse('<template></script>')).toThrow();
    });
  });

  describe('edge cases', () => {
    it('parses empty template content', () => {
      const desc = parse('<template></template>');
      expect(desc.template).toBeDefined();
      expect(desc.template!.content).toBe('');
    });

    it('parses template with only whitespace', () => {
      const desc = parse('<template>   \n  </template>');
      expect(desc.template).toBeDefined();
    });

    it('parses SFC with no template block', () => {
      const desc = parse('<script setup>const x = 1</script>');
      expect(desc.template).toBeNull();
      expect(desc.scriptSetup).toBeDefined();
    });

    it('parses SFC with BOM in source', () => {
      const bom = '\uFEFF';
      const desc = parse(`${bom}<template><Box/></template>`);
      expect(desc.template).toBeDefined();
    });

    it('parses template with complex expression', () => {
      const desc = parse(
        '<template><Text :value="`${count}`"/></template>'
        + '<script setup>const count = ref(0)</script>',
      );
      expect(desc.template).toBeDefined();
      expect(desc.template!.content).toContain('count');
    });

    it('parses template with v-for and v-if', () => {
      const desc = parse(
        '<template><Text v-for="item in items" v-if="show"/></template>',
      );
      expect(desc.template).toBeDefined();
    });
  });
});
