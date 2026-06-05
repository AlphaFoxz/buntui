import {describe, it, expect} from 'bun:test';
import {compile} from '../compile';

describe('compile', () => {
  describe('basic compilation', () => {
    it('compiles minimal template with single widget', () => {
      const result = compile('<template><Box x="1" y="2"/></template>');
      expect(result.code).toContain('createBox');
      expect(result.code).toContain('__scene.mount');
      expect(result.code).toContain('export function setup(__scene)');
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
      expect(result.code).toContain('MyWidget.setup(__scene)');
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
    it('generates for-of loop with unref for array iteration', () => {
      const result = compile('<template><Text v-for="item in items" :value="item"/></template>');
      expect(result.code).toContain('for (const item of unref(items))');
      expect(result.code).toContain('createTextWidget');
    });

    it('generates entries() loop with unref for indexed iteration', () => {
      const result = compile('<template><Text v-for="(item, i) in items"/></template>');
      expect(result.code).toContain('unref(items).entries()');
    });

    it('generates numeric range loop', () => {
      const result = compile('<template><Text v-for="n in 5"/></template>');
      expect(result.code).toContain('for (let n = 1; n <= 5; n++)');
    });

    it('filters out :key from widget props in v-for', () => {
      const result = compile('<template><Text v-for="item in items" :key="item" :value="item"/></template>');
      expect(result.code).not.toContain('key:');
      expect(result.code).toContain('value: unref(item)');
    });

    it('filters out static key attribute from widget props', () => {
      const result = compile('<template><Text v-for="item in items" key="fixed" :value="item"/></template>');
      expect(result.code).not.toContain('key:');
      expect(result.code).toContain('createTextWidget');
    });
  });

  describe('v-for with :key (reactive keyed list)', () => {
    it('generates effect with Map for keyed list', () => {
      const result = compile('<template><Text v-for="item in items" :key="item" :value="item"/></template>');
      expect(result.code).toContain('new Map()');
      expect(result.code).toContain('effect(() => {');
    });

    it('creates or reuses widgets by key', () => {
      const result = compile('<template><Text v-for="item in items" :key="item" :value="item"/></template>');
      expect(result.code).toContain('.get(');
      expect(result.code).toContain('__new.set(');
    });

    it('removes stale widgets on re-render', () => {
      const result = compile('<template><Text v-for="item in items" :key="item" :value="item"/></template>');
      expect(result.code).toContain('unmount(');
    });

    it('adds child to parent widget in keyed list', () => {
      const result = compile('<template><Box><Text v-for="item in items" :key="item" :value="item"/></Box></template>');
      expect(result.code).toContain('.addChild(');
      expect(result.code).toContain('new Map()');
    });

    it('does not pass key as widget constructor prop', () => {
      const result = compile('<template><Text v-for="item in items" :key="item.id" :value="item.name"/></template>');
      expect(result.code).not.toContain('key:');
      expect(result.code).toContain('unref(item).id');
    });

    it('updates dynamic props on reused widgets', () => {
      const result = compile('<template><Text v-for="item in items" :key="item" :value="item"/></template>');
      expect(result.code).toContain('updateValue');
    });

    it('imports effect and unref for keyed list', () => {
      const result = compile('<template><Text v-for="item in items" :key="item"/></template>');
      expect(result.imports.some(i => i.includes('effect') && i.includes('unref'))).toBe(true);
    });

    it('supports indexed keyed iteration', () => {
      const result = compile('<template><Text v-for="(item, i) in items" :key="item" :value="item"/></template>');
      expect(result.code).toContain('entries()');
      expect(result.code).toContain('new Map()');
    });

    it('supports nested widget children in keyed list', () => {
      const result = compile('<template><Box v-for="item in items" :key="item"><Text :value="item"/></Box></template>');
      expect(result.code).toContain('new Map()');
      expect(result.code).toContain('createTextWidget');
      expect(result.code).toContain('.addChild(');
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

    it('generates ref index access assignment for array v-model', () => {
      const result = compile('<template><Input v-model="values[index]"/></template>');
      expect(result.code).toContain('values.value[index] = $event.value');
    });

    it('generates direct assignment for member expression v-model', () => {
      const result = compile('<template><Input v-model="state.name"/></template>');
      expect(result.code).toContain('state.name = $event.value');
    });

    it('generates checked binding for Checkbox', () => {
      const result = compile('<template><Checkbox v-model="enabled"/></template>');
      expect(result.code).toContain('unref(enabled)');
      expect(result.code).toContain('$event.checked');
    });

    it('generates named v-model with update: event', () => {
      const result = compile('<template><Input v-model:value="text"/></template>');
      expect(result.code).toContain('unref(text)');
      expect(result.code).toContain('text.value = $event.value');
      expect(result.code).toContain(".on('update:value'");
    });

    it('named v-model overrides per-tag config', () => {
      const result = compile('<template><Checkbox v-model:label="name"/></template>');
      expect(result.code).toContain('unref(name)');
      expect(result.code).toContain('name.value = $event.label');
      expect(result.code).toContain(".on('update:label'");
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

    it('generates key modifier guard for @key.enter', () => {
      const result = compile('<template><Input @key.enter="onEnter"/></template>');
      expect(result.code).toContain(".on('key', ($event) =>");
      expect(result.code).toContain("$event.key === 'Enter'");
      expect(result.code).toContain('onEnter');
    });

    it('generates system modifier + key modifier for @key.ctrl.enter', () => {
      const result = compile('<template><Input @key.ctrl.enter="onCtrlEnter"/></template>');
      expect(result.code).toContain('$event.ctrlKey');
      expect(result.code).toContain("$event.key === 'Enter'");
      expect(result.code).toContain('onCtrlEnter');
    });

    it('generates stop modifier for @click.stop', () => {
      const result = compile('<template><Button @click.stop="onClick"/></template>');
      expect(result.code).toContain('$event.stopPropagation()');
      expect(result.code).toContain('onClick');
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
      expect(result.code).toContain('for (const [index, item] of unref(items).entries())');
      expect(result.code).toContain('createTextWidget');
    });

    it('compiles script setup + template with refs and dynamic props', () => {
      const sfc = '<template><Text :value="msg"/></template>'
        + '<script setup>import {ref} from "@vue/reactivity";\nconst msg = ref("hello");</script>';
      const result = compile(sfc);
      expect(result.code).toContain('const msg = ref("hello");');
      expect(result.code).toContain('effect(() => {');
    });

    it('passes through computed declarations and uses unref for bindings', () => {
      const sfc = '<template><Text :value="label"/></template>'
        + '<script setup lang="ts">'
        + 'import {ref, computed} from "@vue/reactivity";\n'
        + 'const count = ref(0);\n'
        + 'const label = computed(() => `Count: ${count.value}`);'
        + '</script>';
      const result = compile(sfc);
      expect(result.code).toContain('const count = ref(0);');
      expect(result.code).toContain('const label = computed(() => `Count: ${count.value}`);');
      expect(result.code).toContain('unref(label)');
      expect(result.code).toContain('import {ref, computed} from "@vue/reactivity"');
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
      expect(result.code).toContain('export function setup(__scene)');
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

    it('handles multi-line import with complex destructuring', () => {
      const result = compile(
        '<template><Box/></template>'
        + '<script setup>'
        + 'import {\n'
        + '  ref,\n'
        + '  computed,\n'
        + '  watch,\n'
        + '} from "vue";\n'
        + 'const count = ref(0);'
        + '</script>',
      );
      expect(result.code).toContain('import {');
      expect(result.code).toContain('  ref,');
      expect(result.code).toContain('  computed,');
      expect(result.code).toContain('  watch,');
      expect(result.code).toContain('const count = ref(0);');
      const setupIdx = result.code.indexOf('export function setup');
      const importIdx = result.code.indexOf('import {');
      expect(importIdx).toBeLessThan(setupIdx);
    });

    it('preserves dynamic import() in body', () => {
      const result = compile(
        '<template><Box/></template>'
        + '<script setup>'
        + 'const mod = import("./foo");'
        + '</script>',
      );
      const setupIdx = result.code.indexOf('export function setup');
      const dynamicImportIdx = result.code.indexOf('import("./foo")');
      expect(dynamicImportIdx).toBeGreaterThan(setupIdx);
      expect(result.code).toContain('import("./foo")');
    });

    it('handles import type as top-level import', () => {
      const result = compile(
        '<template><Box/></template>'
        + '<script setup>'
        + 'import type { Foo } from "bar";\n'
        + 'const x = 1;'
        + '</script>',
      );
      const setupIdx = result.code.indexOf('export function setup');
      const typeImportIdx = result.code.indexOf('import type { Foo }');
      expect(typeImportIdx).toBeLessThan(setupIdx);
      expect(result.code).toContain('const x = 1;');
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
      expect(result.code).toContain('CompA.setup(__scene)');
      expect(result.code).toContain('CompB.setup(__scene)');
    });
  });

  describe('edge cases: .vue component under v-if', () => {
    it('generates cleanup call for component in v-if branch', () => {
      const result = compile(
        '<template><CompA v-if="show"/></template>'
        + '<script setup>import CompA from "./CompA.vue";</script>',
      );
      expect(result.code).toContain('__runSetup(__scene, () => CompA.setup(__scene))');
      expect(result.code).toMatch(/_compa0\(\)/);
      expect(result.code).toContain('_compa0 = null');
    });

    it('generates cleanup for component in v-if with widget v-else', () => {
      const result = compile(
        '<template><CompA v-if="show"/><Text v-else/></template>'
        + '<script setup>import CompA from "./CompA.vue";</script>',
      );
      expect(result.code).toContain('__runSetup(__scene, () => CompA.setup(__scene))');
      expect(result.code).toMatch(/_compa0\(\)/);
      expect(result.code).toContain('createTextWidget');
    });
  });

  describe('edge cases: .vue component under v-for', () => {
    it('generates loop with component setup call', () => {
      const result = compile(
        '<template><CompA v-for="item in items"/></template>'
        + '<script setup>import CompA from "./CompA.vue";</script>',
      );
      expect(result.code).toContain('for (const item of unref(items))');
      expect(result.code).toContain('CompA.setup(__scene)');
    });
  });

  describe('edge cases: nested .vue components with cleanup', () => {
    it('calls cleanup for descendant component in v-if branch', () => {
      const result = compile(
        '<template><CompA v-if="show"><CompB/></CompA></template>'
        + '<script setup>'
        + 'import CompA from "./CompA.vue";\n'
        + 'import CompB from "./CompB.vue";\n'
        + '</script>',
      );
      expect(result.code).toContain('__runSetup(__scene, () => CompA.setup(__scene))');
      expect(result.code).toContain('__runSetup(__scene, () => CompB.setup(__scene))');
      expect(result.code).toMatch(/_compa0\(\)/);
      expect(result.code).toMatch(/_compb1\(\)/);
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

  describe('template ref', () => {
    it('generates ref assignment from ref attribute', () => {
      const result = compile('<template><Input ref="inputRef"/></template>');
      expect(result.code).toContain('inputRef.value = __input0;');
      expect(result.code).not.toContain('ref:');
    });

    it('works with useTemplateRef from vue', () => {
      const result = compile(
        '<template><Input ref="inputRef"/></template>'
        + '<script setup>import {useTemplateRef} from "vue";\nconst inputRef = useTemplateRef("inputRef");</script>',
      );
      expect(result.code).toContain('inputRef.value = __input0;');
      expect(result.imports.some(i => i.includes('useTemplateRef') && i.includes('@buntui/core'))).toBe(true);
    });

    it('works with plain ref from @vue/reactivity', () => {
      const result = compile(
        '<template><Input ref="myInput"/></template>'
        + '<script setup>import {ref} from "@vue/reactivity";\nconst myInput = ref();</script>',
      );
      expect(result.code).toContain('myInput.value = __input0;');
    });
  });

  describe('import rewriting', () => {
    it('rewrites from "vue" to "@vue/reactivity" for reactivity functions', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {ref, computed} from "vue";\nconst msg = ref("hello");</script>',
      );
      expect(result.imports.some(i => i.includes('ref') && i.includes('@vue/reactivity'))).toBe(true);
      expect(result.imports.some(i => i.includes('computed') && i.includes('@vue/reactivity'))).toBe(true);
      expect(result.imports.some(i => i.includes("from 'vue'") || i.includes('from "vue"'))).toBe(false);
    });

    it('splits mixed import: lifecycle to @buntui/core, reactivity to @vue/reactivity', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {ref, onMounted} from "vue";\nconst msg = ref("hello");\nonMounted(() => {});</script>',
      );
      expect(result.imports.some(i => i.includes('onMounted') && i.includes('@buntui/core'))).toBe(true);
      expect(result.imports.some(i => i.includes('ref') && i.includes('@vue/reactivity'))).toBe(true);
      expect(result.imports.some(i => i.includes("from 'vue'") || i.includes('from "vue"'))).toBe(false);
    });

    it('rewrites pure lifecycle import from "vue" to @buntui/core', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {onMounted, onUnmounted} from "vue";\nconst msg = "hello";\nonMounted(() => {});</script>',
      );
      expect(result.imports.some(i => i.includes('onMounted') && i.includes('onUnmounted') && i.includes('@buntui/core'))).toBe(true);
      expect(result.imports.some(i => i.includes("from 'vue'") || i.includes('from "vue"'))).toBe(false);
    });

    it('preserves import from @vue/reactivity as-is', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {ref} from "@vue/reactivity";\nconst msg = ref("hello");</script>',
      );
      expect(result.code).toContain('import {ref} from "@vue/reactivity"');
    });

    it('preserves import from other modules as-is', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {something} from "other-module";\nconst msg = "hello";</script>',
      );
      expect(result.code).toContain('import {something} from "other-module"');
    });

    it('supports custom symbolRedirects', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {ref, myHook} from "vue";\nconst msg = ref("hello");\nmyHook();</script>',
        {symbolRedirects: {myHook: '@custom/pkg'}},
      );
      expect(result.imports.some(i => i.includes('myHook') && i.includes('@custom/pkg'))).toBe(true);
      expect(result.imports.some(i => i.includes('ref') && i.includes('@vue/reactivity'))).toBe(true);
    });

    it('supports custom moduleRewrites', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {ref} from "vue";\nconst msg = ref("hello");</script>',
        {moduleRewrites: {vue: 'my-reactivity'}},
      );
      expect(result.imports.some(i => i.includes('ref') && i.includes('my-reactivity'))).toBe(true);
    });

    it('handles single quote imports', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + "<script setup>import {ref} from 'vue';\nconst msg = ref('hello');</script>",
      );
      expect(result.imports.some(i => i.includes('ref') && i.includes('@vue/reactivity'))).toBe(true);
    });

    it('handles import with onTick and useTemplateRef', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {onTick, useTemplateRef} from "vue";\nconst msg = "hello";</script>',
      );
      expect(result.imports.some(i => i.includes('onTick') && i.includes('useTemplateRef') && i.includes('@buntui/core'))).toBe(true);
    });

    it('does not rewrite import type', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import type {Ref} from "vue";\nconst msg = "hello";</script>',
      );
      expect(result.code).toContain('import type {Ref} from "vue"');
    });

    it('resolves custom coreModuleId for symbolRedirects', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {onMounted} from "vue";\nconst msg = "hello";</script>',
        {codegen: {coreModuleId: 'custom-core'}},
      );
      expect(result.imports.some(i => i.includes('onMounted') && i.includes('custom-core'))).toBe(true);
    });

    it('handles aliased reactivity import (ref as myRef)', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {ref as myRef} from "vue";\nconst msg = myRef("hello");</script>',
      );
      expect(result.imports.some(i => i.includes('ref as myRef') && i.includes('@vue/reactivity'))).toBe(true);
    });

    it('handles aliased lifecycle import (onMounted as mounted)', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {onMounted as mounted} from "vue";\nconst msg = "hello";\nmounted(() => {});</script>',
      );
      expect(result.imports.some(i => i.includes('onMounted as mounted') && i.includes('@buntui/core'))).toBe(true);
    });

    it('handles mixed aliased and non-aliased imports', () => {
      const result = compile(
        '<template><Text :value="msg"/></template>'
        + '<script setup>import {ref as myRef, onMounted} from "vue";\nconst msg = myRef("hello");\nonMounted(() => {});</script>',
      );
      expect(result.imports.some(i => i.includes('onMounted') && i.includes('@buntui/core'))).toBe(true);
      expect(result.imports.some(i => i.includes('ref as myRef') && i.includes('@vue/reactivity'))).toBe(true);
    });
  });

  describe('per-widget propHandlers integration', () => {
    it('generates updateColor for Input :colorFg', () => {
      const result = compile('<template><Input :colorFg="color"/></template>');
      expect(result.code).toContain('updateColor');
      expect(result.code).toContain('colorFg');
    });

    it('generates updateBorder for Input :borderStyle', () => {
      const result = compile('<template><Input :borderStyle="s"/></template>');
      expect(result.code).toContain('updateBorder');
    });

    it('generates setMax for Progress :max', () => {
      const result = compile('<template><Progress :max="limit"/></template>');
      expect(result.code).toContain('setMax');
    });

    it('generates setVisible for any widget with v-show', () => {
      const result = compile('<template><Input v-show="visible"/></template>');
      expect(result.code).toContain('setVisible');
    });

    it('throws on unknown prop when widget has propHandlers', () => {
      expect(() => compile('<template><Input :colorBorder="c"/></template>')).toThrow(/Unknown prop "colorBorder" on <Input>/);
    });

    it('throws on unknown prop with suggestion of valid props', () => {
      expect(() => compile('<template><Progress :unknown="x"/></template>')).toThrow(/This widget only accepts:/);
    });

    it('passes dynamic props to constructor only for extension imports (no reactive effect)', () => {
      const result = compile(
        '<template><Matrix :colorFg="c"/></template>'
        + '<script setup>import Matrix from "@buntui/extensions/matrix";</script>',
      );
      expect(result.code).toContain('colorFg: unref(c)');
      expect(result.code).not.toContain('updateColor');
    });
  });
});
