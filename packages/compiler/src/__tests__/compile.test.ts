import {describe, it, expect} from 'bun:test';
import {compile} from '../compile';

describe('compile', () => {
  describe('basic compilation', () => {
    it('compiles minimal template with single widget', () => {
      const result = compile('<template><Box x="1" y="2"/></template>');
      expect(result.code).toContain('createBox');
      expect(result.code).toContain('scene.mount');
      expect(result.code).toContain('export function setup(scene)');
      expect(result.code).toContain('export default { setup };');
      expect(result.imports.length).toBeGreaterThan(0);
      expect(result.imports.some(i => i.includes('createBox'))).toBe(true);
    });

    it('returns placeholder when no template block', () => {
      const result = compile('<script setup>const x = 1</script>');
      expect(result.code).toBe('// No template block found');
      expect(result.imports).toEqual([]);
    });

    it('returns templateAst', () => {
      const result = compile('<template><Box/></template>');
      expect(result.templateAst).toBeDefined();
    });

    it('returns descriptor with template and script blocks', () => {
      const result = compile('<template><Box/></template><script setup>const x = 1</script>');
      expect(result.descriptor.template).toBeDefined();
      expect(result.descriptor.scriptSetup).toBeDefined();
    });
  });

  describe('script setup integration', () => {
    it('splits import lines into imports array', () => {
      const result = compile(
        '<template><Box/></template>'
        + '<script setup lang="ts">import {ref} from "@vue/reactivity";\nconst count = ref(0);</script>',
      );
      expect(result.imports.some(i => i.includes('ref') && i.includes('@vue/reactivity'))).toBe(true);
    });

    it('embeds non-import script lines inside setup()', () => {
      const result = compile(
        '<template><Box/></template>'
        + '<script setup>const count = ref(0);</script>',
      );
      expect(result.code).toContain('const count = ref(0);');
    });
  });

  describe('component imports', () => {
    it('detects .vue imports as components', () => {
      const result = compile(
        '<template><MyWidget/></template>'
        + '<script setup>import MyWidget from "./MyWidget.vue";</script>',
      );
      expect(result.code).toContain('MyWidget.setup(scene)');
    });

    it('ignores non-.vue imports as components', () => {
      const result = compile(
        '<template><Box/></template>'
        + '<script setup>import {ref} from "@vue/reactivity";</script>',
      );
      expect(result.code).not.toContain('ref.setup(scene)');
    });
  });

  describe('v-for', () => {
    it('generates for-of loop for array iteration', () => {
      const result = compile('<template><Text v-for="item in items" :value="item"/></template>');
      expect(result.code).toContain('for (const item of items)');
      expect(result.code).toContain('createTextWidget');
    });

    it('generates entries() loop for indexed iteration', () => {
      const result = compile('<template><Text v-for="(item, i) in items"/></template>');
      expect(result.code).toContain('items.entries()');
    });

    it('generates numeric range loop', () => {
      const result = compile('<template><Text v-for="n in 5"/></template>');
      expect(result.code).toContain('for (let n = 1; n <= 5; n++)');
    });
  });

  describe('v-if / v-else-if / v-else', () => {
    it('generates conditional effect with if/else', () => {
      const result = compile('<template><Box v-if="show"/><Text v-else/></template>');
      expect(result.code).toContain('effect(() => {');
      expect(result.code).toMatch(/if\s*\(unref\(show\)\)/);
      expect(result.code).toContain('else {');
    });

    it('generates chain for v-if/v-else-if/v-else', () => {
      const result = compile('<template><Box v-if="a"/><Text v-else-if="b"/><Button v-else/></template>');
      expect(result.code).toMatch(/if\s*\(unref\(a\)\)/);
      expect(result.code).toMatch(/else if\s*\(unref\(b\)\)/);
      expect(result.code).toContain('else {');
    });
  });

  describe('v-model', () => {
    it('generates two-way binding for Input', () => {
      const result = compile('<template><Input v-model="query"/></template>');
      expect(result.code).toContain('unref(query)');
      expect(result.code).toContain('query.value = $event.value');
    });

    it('generates checked binding for Checkbox', () => {
      const result = compile('<template><Checkbox v-model="enabled"/></template>');
      expect(result.code).toContain('unref(enabled)');
      expect(result.code).toContain('$event.checked');
    });

    it('generates checked binding for Switch', () => {
      const result = compile('<template><Switch v-model="active"/></template>');
      expect(result.code).toContain('unref(active)');
      expect(result.code).toContain('$event.checked');
    });
  });

  describe('props and events', () => {
    it('passes static props to constructor', () => {
      const result = compile('<template><Text value="hello" x="5"/></template>');
      expect(result.code).toContain('"hello"');
      expect(result.code).toContain('"5"');
    });

    it('generates reactive effects for dynamic props', () => {
      const result = compile('<template><Box :x="pos.x" :y="pos.y"/></template>');
      expect(result.code).toContain('effect(() => {');
      expect(result.code).toMatch(/updateRect/);
      expect(result.imports.some(i => i.includes('effect') && i.includes('unref'))).toBe(true);
    });

    it('generates .on() call for @click', () => {
      const result = compile('<template><Button @click="handleClick"/></template>');
      expect(result.code).toContain(".on('click', handleClick)");
    });
  });

  describe('v-show', () => {
    it('generates setVisible effect', () => {
      const result = compile('<template><Box v-show="isVisible"/></template>');
      expect(result.code).toContain('setVisible');
      expect(result.code).toContain('unref(isVisible)');
    });
  });

  describe('CompileOptions', () => {
    it('passes coreModuleId to codegen', () => {
      const result = compile('<template><Box/></template>', {
        codegen: {coreModuleId: 'custom-core'},
      });
      expect(result.imports.some(i => i.includes('custom-core'))).toBe(true);
    });

    it('passes reactivityModuleId to codegen', () => {
      const result = compile('<template><Box :x="pos.x"/></template>', {
        codegen: {reactivityModuleId: 'custom-react'},
      });
      expect(result.imports.some(i => i.includes('custom-react'))).toBe(true);
    });
  });

  describe('error cases', () => {
    it('throws on unknown tag in template', () => {
      expect(() => compile('<template><NotAWidget/></template>')).toThrow('Unknown component');
    });

    it('throws on broken SFC', () => {
      expect(() => compile('<template><Box')).toThrow();
    });
  });

  describe('complex composition', () => {
    it('compiles nested v-for inside a parent widget', () => {
      const sfc = '<template>'
        + '<ScrollBox :x="1" :y="1" :width="30" :height="10">'
        + '<template v-for="(item, index) in items">'
        + '<Text :x="1" :y="index" :value="item"/>'
        + '</template>'
        + '</ScrollBox>'
        + '</template>';
      const result = compile(sfc);
      expect(result.code).toContain('createScrollBox');
      expect(result.code).toContain('for (const [index, item] of items.entries())');
      expect(result.code).toContain('createTextWidget');
    });

    it('compiles script setup + template with refs and dynamic props', () => {
      const sfc = '<template><Text :value="msg"/></template>'
        + '<script setup>import {ref} from "@vue/reactivity";\nconst msg = ref("hello");</script>';
      const result = compile(sfc);
      expect(result.code).toContain('const msg = ref("hello");');
      expect(result.code).toContain('effect(() => {');
    });
  });

  // --- Potential issue / edge case tests ---

  describe('edge cases: widgetCounter global state', () => {
    it('produces valid code across multiple sequential compiles', () => {
      const sfc = '<template><Box x="1"/></template>';
      const first = compile(sfc);
      const second = compile(sfc);
      // Both should produce valid runnable code regardless of counter state
      expect(first.code).toContain('createBox({ x: "1" })');
      expect(second.code).toContain('createBox({ x: "1" })');
      // Codegen uses its own per-call index counter — output is deterministic
      expect(first.code).toBe(second.code);
    });
  });

  describe('edge cases: v-for numeric range with index', () => {
    it('generates index 0..N-1 with item = index + 1', () => {
      const result = compile('<template><Text v-for="(item, idx) in 5"/></template>');
      expect(result.code).toContain('for (let idx = 0; idx < 5; idx++)');
      expect(result.code).toContain('const item = idx + 1');
    });
  });

  describe('edge cases: v-model.number modifier', () => {
    it('wraps event payload with Number()', () => {
      const result = compile('<template><Input v-model.number="count"/></template>');
      expect(result.code).toContain('Number($event.value)');
    });
  });

  describe('edge cases: empty template', () => {
    it('compiles empty template without error', () => {
      const result = compile('<template></template>');
      expect(result.code).toContain('export function setup(scene)');
      expect(result.code).not.toContain('scene.mount');
    });
  });

  describe('edge cases: v-if only (no v-else)', () => {
    it('generates final else branch to unmount all widgets', () => {
      const result = compile('<template><Box v-if="show"/></template>');
      expect(result.code).toMatch(/if\s*\(unref\(show\)\)/);
      // Should have a final else to clean up when condition is false
      const elseCount = (result.code.match(/\belse \{/g) ?? []).length;
      expect(elseCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases: splitScript', () => {
    it('handles script with no imports', () => {
      const result = compile(
        '<template><Box/></template>'
        + '<script setup>const x = 1;\nconst y = 2;</script>',
      );
      expect(result.code).toContain('const x = 1;');
      expect(result.code).toContain('const y = 2;');
    });

    it('handles empty script block', () => {
      const result = compile(
        '<template><Box/></template><script setup></script>',
      );
      expect(result.code).toContain('createBox');
    });
  });

  describe('widget tag-named imports', () => {
    it('uses PascalCase import as creator when not in registry', () => {
      const registry = {
        Box: {creator: 'createBox', module: '@buntui/core'},
      };
      const result = compile(
        '<template><Box/><Matrix width="100%"/></template>'
        + '<script setup>import {Matrix} from "@buntui/extensions/matrix";</script>',
        {registry},
      );
      // Matrix not in registry → resolved via widget import
      expect(result.code).toContain('Matrix({');
      // No codegen-generated import for Matrix — script import provides it
      expect(result.imports.some(i => i.includes('createMatrixWidget'))).toBe(false);
      // Box is in registry → gets a codegen import
      expect(result.imports.some(i => i.includes('createBox'))).toBe(true);
    });

    it('supports aliased imports', () => {
      const result = compile(
        '<template><Matrix/></template>'
        + '<script setup>import {Matrix as Rain} from "@buntui/extensions/matrix";</script>',
      );
      expect(result.code).toContain('Rain()');
      expect(result.imports.some(i => i.includes('createMatrixWidget'))).toBe(false);
    });

    it('registry tags take precedence over imports', () => {
      const registry = {
        Box: {creator: 'createBox', module: '@buntui/core'},
      };
      const result = compile(
        '<template><Box/></template>'
        + '<script setup>import {Box} from "other-module";</script>',
        {registry},
      );
      // Box IS in registry → registry wins, ignores the import
      expect(result.imports.some(i => i.includes('createBox') && i.includes('@buntui/core'))).toBe(true);
    });

    it('throws on unknown tag without import', () => {
      expect(() => compile(
        '<template><Matrix/></template>'
        + '<script setup>import {ref} from "@vue/reactivity";</script>',
      )).toThrow('Unknown component');
    });
  });

  describe('edge cases: multiple .vue component imports', () => {
    it('detects multiple component imports', () => {
      const result = compile(
        '<template><CompA/><CompB/></template>'
        + '<script setup>'
        + 'import CompA from "./CompA.vue";\n'
        + 'import CompB from "./CompB.vue";\n'
        + '</script>',
      );
      expect(result.code).toContain('CompA.setup(scene)');
      expect(result.code).toContain('CompB.setup(scene)');
    });
  });

  describe('edge cases: regular <script> (not setup)', () => {
    it('uses regular script content when scriptSetup is absent', () => {
      const result = compile(
        '<template><Box/></template>'
        + '<script>const x = 1;</script>',
      );
      expect(result.code).toContain('const x = 1;');
    });
  });
});
