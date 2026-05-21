import {describe, it, expect} from 'bun:test';
import {generate, type CodegenOptions} from '../template/codegen';
import type {
  TuiRenderRoot,
  TuiWidgetCall,
  TuiConditionalBlock,
  TuiListBlock,
  TuiReactiveEffect,
} from '../template/ast';
import type {SourceLocation} from '@vue/compiler-core';

const STUB_LOC: SourceLocation = {
  start: {offset: 0, line: 1, column: 0},
  end: {offset: 0, line: 1, column: 0},
  source: '',
};

function makeRoot(
  children: TuiRenderRoot['children'] = [],
  effects: TuiReactiveEffect[] = [],
  usedCreators: Set<string> = new Set(),
  usedModules: Map<string, string> = new Map(),
): TuiRenderRoot {
  return {type: 'TuiRenderRoot', children, effects, usedCreators, usedModules};
}

function makeWidget(overrides: Partial<TuiWidgetCall> = {}): TuiWidgetCall {
  return {
    type: 'TuiWidgetCall',
    tag: 'Box',
    creator: 'createBox',
    props: [],
    dynamicProps: [],
    events: [],
    children: [],
    loc: STUB_LOC,
    ...overrides,
  };
}

function gen(
  root: TuiRenderRoot,
  options?: CodegenOptions,
) {
  return generate(root, options);
}

describe('codegen', () => {
  describe('imports', () => {
    it('groups creators from same module into one import', () => {
      const root = makeRoot(
        [makeWidget(), makeWidget({tag: 'Text', creator: 'createTextWidget'})],
        [],
        new Set(['createBox', 'createTextWidget']),
      );
      const result = gen(root);
      const coreImports = result.imports.filter(i => i.includes('@buntui/core'));
      expect(coreImports).toHaveLength(1);
      expect(coreImports[0]).toContain('createBox');
      expect(coreImports[0]).toContain('createTextWidget');
    });

    it('uses custom coreModuleId', () => {
      const root = makeRoot([], [], new Set(['createBox']));
      const result = gen(root, {coreModuleId: 'custom-core'});
      expect(result.imports.some(i => i.includes('custom-core'))).toBe(true);
    });

    it('uses usedModules from registry for import source', () => {
      const usedModules = new Map([['createMatrixWidget', '@buntui/extensions']]);
      const root = makeRoot([], [], new Set(['createMatrixWidget']), usedModules);
      const result = gen(root);
      expect(result.imports.some(i => i.includes('@buntui/extensions') && i.includes('createMatrixWidget'))).toBe(true);
    });

    it('imports reactivity helpers when effects exist', () => {
      const effects: TuiReactiveEffect[] = [
        {type: 'TuiReactiveEffect', widgetId: '_box0', updateMethod: 'updateRect', expression: 'unref(x)'},
      ];
      const root = makeRoot([], effects, new Set(['createBox']));
      const result = gen(root);
      expect(result.imports.some(i => i.includes('effect') && i.includes('unref'))).toBe(true);
    });
  });

  describe('setup function structure', () => {
    it('generates export function setup(scene)', () => {
      const root = makeRoot([makeWidget()], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('export function setup(__scene) {');
      expect(result.code).toContain('export default { setup };');
    });

    it('embeds scriptBody lines', () => {
      const root = makeRoot([makeWidget()], [], new Set(['createBox']));
      const result = gen(root, {scriptBody: ['const count = ref(0);', 'console.log(count);']});
      expect(result.code).toContain('const count = ref(0);');
      expect(result.code).toContain('console.log(count);');
    });
  });

  describe('widget creation', () => {
    it('generates widget variable with constructor call', () => {
      const root = makeRoot(
        [makeWidget({props: [{type: 'TuiStaticProp', name: 'x', value: '10'}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain('createBox({ x: "10" })');
    });

    it('serializes boolean flags as true/false', () => {
      const root = makeRoot(
        [makeWidget({props: [{type: 'TuiStaticProp', name: 'disabled', value: 'true'}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain('disabled: true');
      expect(result.code).not.toContain('"true"');
    });

    it('passes dynamic props with unref() to constructor', () => {
      const root = makeRoot(
        [makeWidget({dynamicProps: [{type: 'TuiDynamicProp', name: 'width', expression: 'myWidth', loc: STUB_LOC}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain('unref(myWidth)');
    });

    it('creates widget with no props', () => {
      const root = makeRoot([makeWidget()], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toMatch(/createBox\(\)/);
    });
  });

  describe('reactive effects', () => {
    it('generates effect() for grouped prop (rect)', () => {
      const root = makeRoot(
        [makeWidget({dynamicProps: [{type: 'TuiDynamicProp', name: 'x', expression: 'pos.x', loc: STUB_LOC}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toMatch(/effect\(\(\) => \{.*updateRect.*unref\(pos\.x\)/s);
    });

    it('generates effect() for primitive prop (value)', () => {
      const root = makeRoot(
        [makeWidget({tag: 'Text', creator: 'createTextWidget', dynamicProps: [{type: 'TuiDynamicProp', name: 'value', expression: 'text', loc: STUB_LOC}]})],
        [],
        new Set(['createTextWidget']),
      );
      const result = gen(root);
      expect(result.code).toMatch(/effect\(\(\) => \{.*updateValue.*unref\(text\)/s);
    });
  });

  describe('event handlers', () => {
    it('generates .on() registration', () => {
      const root = makeRoot(
        [makeWidget({events: [{type: 'TuiEventBinding', event: 'click', handler: 'handleClick', modifiers: [], loc: STUB_LOC}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain(".on('click', handleClick)");
    });

    it('generates key modifier guard', () => {
      const root = makeRoot(
        [makeWidget({events: [{type: 'TuiEventBinding', event: 'key', handler: 'onEnter', modifiers: ['enter'], loc: STUB_LOC}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain(".on('key', ($event) =>");
      expect(result.code).toContain("$event.key === 'Enter'");
      expect(result.code).toContain('onEnter');
    });

    it('generates system modifier + key modifier guard', () => {
      const root = makeRoot(
        [makeWidget({events: [{type: 'TuiEventBinding', event: 'key', handler: 'onCtrlEnter', modifiers: ['ctrl', 'enter'], loc: STUB_LOC}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain('$event.ctrlKey');
      expect(result.code).toContain("$event.key === 'Enter'");
      expect(result.code).toContain('onCtrlEnter');
    });

    it('generates stop modifier', () => {
      const root = makeRoot(
        [makeWidget({events: [{type: 'TuiEventBinding', event: 'click', handler: 'onClick', modifiers: ['stop'], loc: STUB_LOC}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain('$event.stopPropagation()');
      expect(result.code).toContain('onClick');
    });

    it('generates escape key modifier', () => {
      const root = makeRoot(
        [makeWidget({events: [{type: 'TuiEventBinding', event: 'key', handler: 'onEsc', modifiers: ['escape'], loc: STUB_LOC}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain("$event.key === 'Escape'");
    });

    it('generates arrow key modifier', () => {
      const root = makeRoot(
        [makeWidget({events: [{type: 'TuiEventBinding', event: 'key', handler: 'onUp', modifiers: ['up'], loc: STUB_LOC}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain("$event.key === 'ArrowUp'");
    });

    it('generates function key modifier', () => {
      const root = makeRoot(
        [makeWidget({events: [{type: 'TuiEventBinding', event: 'key', handler: 'onF1', modifiers: ['f1'], loc: STUB_LOC}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain("$event.key === 'F1'");
    });

    it('passes through unknown modifier as key name', () => {
      const root = makeRoot(
        [makeWidget({events: [{type: 'TuiEventBinding', event: 'key', handler: 'onX', modifiers: ['x'], loc: STUB_LOC}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain("$event.key === 'x'");
    });

    it('no wrapper for empty modifiers', () => {
      const root = makeRoot(
        [makeWidget({events: [{type: 'TuiEventBinding', event: 'click', handler: 'handleClick', modifiers: [], loc: STUB_LOC}]})],
        [],
        new Set(['createBox']),
      );
      const result = gen(root);
      expect(result.code).toContain(".on('click', handleClick)");
      expect(result.code).not.toContain('$event');
    });
  });

  describe('children', () => {
    it('generates addChild for nested widgets', () => {
      const child = makeWidget({tag: 'Text', creator: 'createTextWidget'});
      const parent = makeWidget({children: [child]});
      const root = makeRoot([parent], [], new Set(['createBox', 'createTextWidget']));
      const result = gen(root);
      expect(result.code).toContain('.addChild(');
    });
  });

  describe('conditional blocks', () => {
    it('generates if/else effect with mount/unmount', () => {
      const block: TuiConditionalBlock = {
        type: 'TuiConditionalBlock',
        condition: 'showA',
        consequent: [makeWidget()],
        alternate: [makeWidget({tag: 'Text', creator: 'createTextWidget'})],
        loc: STUB_LOC,
      };
      const root = makeRoot([block], [], new Set(['createBox', 'createTextWidget']));
      const result = gen(root);
      expect(result.code).toContain('effect(() => {');
      expect(result.code).toMatch(/if\s*\(unref\(showA\)\)/);
      expect(result.code).toContain('else {');
      expect(result.code).toContain('scene.mount(');
      expect(result.code).toContain('scene.unmount(');
    });

    it('declares widget vars as let null', () => {
      const block: TuiConditionalBlock = {
        type: 'TuiConditionalBlock',
        condition: 'show',
        consequent: [makeWidget()],
        alternate: [makeWidget({tag: 'Text', creator: 'createTextWidget'})],
        loc: STUB_LOC,
      };
      const root = makeRoot([block], [], new Set(['createBox', 'createTextWidget']));
      const result = gen(root);
      expect(result.code).toMatch(/let __box\d+ = null/);
      expect(result.code).toMatch(/let __text\d+ = null/);
    });
  });

  describe('list blocks', () => {
    it('generates for...of loop for array iteration', () => {
      const list: TuiListBlock = {
        type: 'TuiListBlock',
        itemVar: 'item',
        listExpression: 'items',
        body: [makeWidget()],
        loc: STUB_LOC,
      };
      const root = makeRoot([list], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('for (const item of items) {');
    });

    it('generates entries() loop for array with index', () => {
      const list: TuiListBlock = {
        type: 'TuiListBlock',
        itemVar: 'item',
        indexVar: 'idx',
        listExpression: 'items',
        body: [makeWidget()],
        loc: STUB_LOC,
      };
      const root = makeRoot([list], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('for (const [idx, item] of items.entries()) {');
    });

    it('generates numeric range loop', () => {
      const list: TuiListBlock = {
        type: 'TuiListBlock',
        itemVar: 'n',
        listExpression: '10',
        body: [makeWidget()],
        loc: STUB_LOC,
      };
      const root = makeRoot([list], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('for (let n = 1; n <= 10; n++) {');
    });
  });

  describe('component handling', () => {
    it('generates component setup call', () => {
      const component = makeWidget({tag: 'MyWidget', creator: 'MyWidget', isComponent: true});
      const root = makeRoot([component], [], new Set());
      const result = gen(root);
      expect(result.code).toContain('MyWidget.setup(__scene)');
    });

    it('does not mount component widgets', () => {
      const component = makeWidget({tag: 'MyWidget', creator: 'MyWidget', isComponent: true});
      const root = makeRoot([component], [], new Set());
      const result = gen(root);
      expect(result.code).not.toContain('scene.mount(MyWidget');
    });

    it('wraps component setup with __runSetup', () => {
      const component = makeWidget({tag: 'MyWidget', creator: 'MyWidget', isComponent: true});
      const block: TuiConditionalBlock = {
        type: 'TuiConditionalBlock',
        condition: 'show',
        consequent: [component],
        loc: STUB_LOC,
      };
      const root = makeRoot([block], [], new Set());
      const result = gen(root);
      expect(result.code).toContain('__runSetup(__scene, () => MyWidget.setup(__scene))');
    });

    it('imports runSetup when components exist', () => {
      const component = makeWidget({tag: 'MyWidget', creator: 'MyWidget', isComponent: true});
      const root = makeRoot([component], [], new Set());
      const result = gen(root);
      expect(result.imports.some(i => i.includes('runSetup as __runSetup'))).toBe(true);
    });

    it('does not import runSetup without components', () => {
      const root = makeRoot([makeWidget()], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.imports.some(i => i.includes('__runSetup'))).toBe(false);
    });
  });

  // --- Potential issue / edge case tests ---

  describe('edge cases: FLAG_PROP_MAP consistency', () => {
    it('top-level widgets serialize visible as string "true"', () => {
      const widget = makeWidget({
        props: [
          {type: 'TuiStaticProp', name: 'visible', value: 'true'},
          {type: 'TuiStaticProp', name: 'x', value: '1'},
        ],
      });
      const root = makeRoot([widget], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('visible: "true"');
      expect(result.code).toContain('x: "1"');
    });

    it('conditional branch widgets include ALL props (including FLAG_PROP_MAP) in creation', () => {
      const widget = makeWidget({
        props: [
          {type: 'TuiStaticProp', name: 'visible', value: 'true'},
          {type: 'TuiStaticProp', name: 'x', value: '1'},
        ],
      });
      const block: TuiConditionalBlock = {
        type: 'TuiConditionalBlock',
        condition: 'show',
        consequent: [widget],
        loc: STUB_LOC,
      };
      const root = makeRoot([block], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('createBox({ visible: "true", x: "1" })');
    });
  });

  describe('edge cases: boolean flag "false" string', () => {
    it('converts string "false" to boolean false', () => {
      const widget = makeWidget({
        props: [{type: 'TuiStaticProp', name: 'disabled', value: 'false'}],
      });
      const root = makeRoot([widget], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('disabled: false');
      expect(result.code).not.toContain('"false"');
    });
  });

  describe('edge cases: wrapConditionExpr', () => {
    it('wraps identifiers in compound expressions', () => {
      const widget = makeWidget({
        dynamicProps: [{type: 'TuiDynamicProp', name: 'visible', expression: 'show && !hidden', loc: STUB_LOC}],
      });
      const root = makeRoot([widget], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('unref(show)');
      expect(result.code).toContain('unref(hidden)');
    });

    it('preserves string literals in condition expressions', () => {
      const widget = makeWidget({
        dynamicProps: [{type: 'TuiDynamicProp', name: 'visible', expression: "tab === 'home'", loc: STUB_LOC}],
      });
      const root = makeRoot([widget], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain("'home'");
      expect(result.code).toContain('unref(tab)');
    });

    it('does not wrap property access after dot', () => {
      const widget = makeWidget({
        dynamicProps: [{type: 'TuiDynamicProp', name: 'visible', expression: 'state.isActive', loc: STUB_LOC}],
      });
      const root = makeRoot([widget], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('unref(state)');
      expect(result.code).not.toContain('unref(isActive)');
    });

    it('wraps identifiers in ternary expressions', () => {
      const widget = makeWidget({
        dynamicProps: [{type: 'TuiDynamicProp', name: 'visible', expression: 'flag ? a : b', loc: STUB_LOC}],
      });
      const root = makeRoot([widget], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('unref(flag) ? unref(a) : unref(b)');
    });

    it('wraps function call identifiers', () => {
      const widget = makeWidget({
        dynamicProps: [{type: 'TuiDynamicProp', name: 'visible', expression: 'fn()', loc: STUB_LOC}],
      });
      const root = makeRoot([widget], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('unref(fn)()');
    });

    it('wraps array identifiers but not numeric indices', () => {
      const widget = makeWidget({
        dynamicProps: [{type: 'TuiDynamicProp', name: 'visible', expression: 'arr[0]', loc: STUB_LOC}],
      });
      const root = makeRoot([widget], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('unref(arr)[0]');
    });

    it('wraps identifiers in numeric comparisons but not number literals', () => {
      const widget = makeWidget({
        dynamicProps: [{type: 'TuiDynamicProp', name: 'visible', expression: 'count > 0', loc: STUB_LOC}],
      });
      const root = makeRoot([widget], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('unref(count) > 0');
    });

    it('preserves template literal strings without wrapping content', () => {
      const widget = makeWidget({
        dynamicProps: [{type: 'TuiDynamicProp', name: 'visible', expression: 'name === `admin`', loc: STUB_LOC}],
      });
      const root = makeRoot([widget], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('unref(name) === `admin`');
      expect(result.code).not.toContain('unref(admin)');
    });
  });

  describe('edge cases: numeric range v-for with index', () => {
    it('generates index loop with item = index + 1', () => {
      const list: TuiListBlock = {
        type: 'TuiListBlock',
        itemVar: 'item',
        indexVar: 'idx',
        listExpression: '5',
        body: [makeWidget()],
        loc: STUB_LOC,
      };
      const root = makeRoot([list], [], new Set(['createBox']));
      const result = gen(root);
      expect(result.code).toContain('for (let idx = 0; idx < 5; idx++)');
      expect(result.code).toContain('const item = idx + 1');
    });
  });

  describe('edge cases: cleanup function', () => {
    it('return cleanup unmounts all mounted widgets', () => {
      const root = makeRoot(
        [makeWidget(), makeWidget({tag: 'Text', creator: 'createTextWidget'})],
        [],
        new Set(['createBox', 'createTextWidget']),
      );
      const result = gen(root);
      expect(result.code).toContain('return () => {');
      expect(result.code).toContain('scene.unmount(');
    });
  });

  describe('edge cases: component with v-show', () => {
    it('generates proxy scene pattern for component v-show', () => {
      const component = makeWidget({
        tag: 'MyWidget',
        creator: 'MyWidget',
        isComponent: true,
        dynamicProps: [{type: 'TuiDynamicProp', name: 'visible', expression: 'show', loc: STUB_LOC}],
      });
      const root = makeRoot([component], [], new Set());
      const result = gen(root);
      expect(result.code).toContain('_w = []');
      expect(result.code).toContain('setVisible');
    });
  });
});
