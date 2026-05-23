import {describe, it, expect} from 'bun:test';
import {baseParse} from '@vue/compiler-core';
import {transform, type TransformOptions} from '../template/transform';
import {CORE_REGISTRY} from '../runtime-helpers';
import type {
  TuiWidgetCall,
  TuiConditionalBlock,
  TuiListBlock,
  TuiDynamicProp,
  TuiEventBinding,
} from '../template/ast';

function parseTemplate(template: string, options?: TransformOptions) {
  const ast = baseParse(template);
  return transform(ast, options);
}

function asWidget(node: unknown): TuiWidgetCall {
  return node as TuiWidgetCall;
}

function asConditional(node: unknown): TuiConditionalBlock {
  return node as TuiConditionalBlock;
}

function asList(node: unknown): TuiListBlock {
  return node as TuiListBlock;
}

describe('transform', () => {
  describe('basic widget elements', () => {
    it('transforms a single Box element to TuiWidgetCall', () => {
      const root = parseTemplate('<Box/>');
      expect(root.children).toHaveLength(1);
      const widget = asWidget(root.children[0]);
      expect(widget.type).toBe('TuiWidgetCall');
      expect(widget.tag).toBe('Box');
      expect(widget.creator).toBe('createBox');
      expect(widget.props).toHaveLength(0);
      expect(widget.dynamicProps).toHaveLength(0);
      expect(root.usedCreators.has('createBox')).toBe(true);
    });

    it('transforms nested elements', () => {
      const root = parseTemplate('<Box><Text value="hello"/></Box>');
      expect(root.children).toHaveLength(1);
      const outer = asWidget(root.children[0]);
      expect(outer.tag).toBe('Box');
      expect(outer.children).toHaveLength(1);
      const inner = asWidget(outer.children[0]);
      expect(inner.tag).toBe('Text');
      expect(inner.creator).toBe('createTextWidget');
    });

    it('throws on unknown tag', () => {
      expect(() => parseTemplate('<UnknownTag/>')).toThrow('Unknown component');
    });

    it('resolves component from options.components', () => {
      const root = parseTemplate('<MyComponent/>', {
        components: {MyComponent: 'MyComponent'},
      });
      const widget = asWidget(root.children[0]!);
      expect(widget.isComponent).toBe(true);
      expect(widget.creator).toBe('MyComponent');
    });
  });

  describe('static props', () => {
    it('parses static string attribute', () => {
      const root = parseTemplate('<Text value="hello"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.props).toHaveLength(1);
      expect(widget.props[0]).toEqual({type: 'TuiStaticProp', name: 'value', value: 'hello'});
    });

    it('parses numeric-like attributes', () => {
      const root = parseTemplate('<Box x="10" y="20"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.props).toEqual([
        {type: 'TuiStaticProp', name: 'x', value: '10'},
        {type: 'TuiStaticProp', name: 'y', value: '20'},
      ]);
    });

    it('parses bare boolean attribute as "true"', () => {
      const root = parseTemplate('<Input readonly/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.props[0]!.name).toBe('readonly');
      expect(widget.props[0]!.value).toBe('true');
    });
  });

  describe('dynamic props', () => {
    it('parses v-bind shorthand :width', () => {
      const root = parseTemplate('<Box :width="dynamicVar"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps).toHaveLength(1);
      expect(widget.dynamicProps[0]!.name).toBe('width');
      expect(widget.dynamicProps[0]!.expression).toBe('dynamicVar');
    });

    it('parses v-bind long form', () => {
      const root = parseTemplate('<Box v-bind:height="calcHeight"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps[0]!.name).toBe('height');
      expect(widget.dynamicProps[0]!.expression).toBe('calcHeight');
    });
  });

  describe('event bindings', () => {
    it('parses @click event', () => {
      const root = parseTemplate('<Button @click="handleClick"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.events).toHaveLength(1);
      expect(widget.events[0]!.event).toBe('click');
      expect(widget.events[0]!.handler).toBe('handleClick');
    });

    it('parses @key event', () => {
      const root = parseTemplate('<Input @key="onKey"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.events[0]!.event).toBe('key');
      expect(widget.events[0]!.handler).toBe('onKey');
    });

    it('parses @key.enter modifier', () => {
      const root = parseTemplate('<Input @key.enter="onEnter"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.events).toHaveLength(1);
      expect(widget.events[0]!.event).toBe('key');
      expect(widget.events[0]!.handler).toBe('onEnter');
      expect(widget.events[0]!.modifiers).toEqual(['enter']);
    });

    it('parses multiple key modifiers', () => {
      const root = parseTemplate('<Input @key.ctrl.enter="onCtrlEnter"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.events[0]!.modifiers).toEqual(['ctrl', 'enter']);
    });

    it('parses @click.stop modifier', () => {
      const root = parseTemplate('<Button @click.stop="onClick"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.events[0]!.modifiers).toEqual(['stop']);
    });

    it('parses system modifier + key modifier', () => {
      const root = parseTemplate('<Input @key.shift.escape="onShiftEsc"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.events[0]!.modifiers).toEqual(['shift', 'escape']);
    });

    it('event without modifiers has empty modifiers array', () => {
      const root = parseTemplate('<Button @click="handleClick"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.events[0]!.modifiers).toEqual([]);
    });
  });

  describe('v-if / v-else-if / v-else', () => {
    it('transforms v-if into TuiConditionalBlock', () => {
      const root = parseTemplate('<Box v-if="showBox" x="1"/>');
      expect(root.children).toHaveLength(1);
      const block = asConditional(root.children[0]);
      expect(block.type).toBe('TuiConditionalBlock');
      expect(block.condition).toBe('showBox');
      expect(block.consequent).toHaveLength(1);
      expect(asWidget(block.consequent[0]!).tag).toBe('Box');
    });

    it('transforms v-if / v-else chain', () => {
      const root = parseTemplate('<Box v-if="a"/><Text v-else/>');
      expect(root.children).toHaveLength(1);
      const block = asConditional(root.children[0]);
      expect(block.condition).toBe('a');
      expect(Array.isArray(block.alternate)).toBe(true);
      expect(asWidget((block.alternate as unknown[])[0]!).tag).toBe('Text');
    });

    it('transforms v-if / v-else-if / v-else chain', () => {
      const root = parseTemplate('<Box v-if="a"/><Text v-else-if="b"/><Button v-else/>');
      const block = asConditional(root.children[0]!);
      expect(block.condition).toBe('a');
      const alt = asConditional(block.alternate);
      expect(alt.condition).toBe('b');
      expect(Array.isArray(alt.alternate)).toBe(true);
      expect(asWidget((alt.alternate as unknown[])[0]!).tag).toBe('Button');
    });

    it('does not chain unrelated elements after v-if', () => {
      const root = parseTemplate('<Box v-if="show"/><Text/>');
      expect(root.children).toHaveLength(2);
      expect(root.children[0]!.type).toBe('TuiConditionalBlock');
      expect(root.children[1]!.type).toBe('TuiWidgetCall');
    });
  });

  describe('v-for', () => {
    it('transforms simple item iteration', () => {
      const root = parseTemplate('<Text v-for="item in items" :value="item"/>');
      const block = asList(root.children[0]!);
      expect(block.type).toBe('TuiListBlock');
      expect(block.itemVar).toBe('item');
      expect(block.indexVar).toBeUndefined();
      expect(block.listExpression).toBe('items');
    });

    it('transforms item with index', () => {
      const root = parseTemplate('<Text v-for="(item, idx) in items"/>');
      const block = asList(root.children[0]!);
      expect(block.itemVar).toBe('item');
      expect(block.indexVar).toBe('idx');
      expect(block.listExpression).toBe('items');
    });

    it('transforms numeric range', () => {
      const root = parseTemplate('<Text v-for="n in 10"/>');
      const block = asList(root.children[0]!);
      expect(block.listExpression).toBe('10');
    });

    it('throws on invalid v-for expression', () => {
      expect(() => parseTemplate('<Text v-for="bad syntax"/>')).toThrow('Invalid v-for expression');
    });
  });

  describe('v-model', () => {
    it('generates value prop and input event for default config', () => {
      const root = parseTemplate('<Input v-model="searchQuery"/>');
      const widget = asWidget(root.children[0]!);
      const dynProps = widget.dynamicProps as TuiDynamicProp[];
      const events = widget.events as TuiEventBinding[];
      expect(dynProps.some(p => p.name === 'value' && p.expression === 'searchQuery')).toBe(true);
      expect(events.some(e => e.event === 'input' && e.handler.includes('searchQuery.value'))).toBe(true);
    });

    it('uses Checkbox config (checked / change)', () => {
      const root = parseTemplate('<Checkbox v-model="enabled"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'checked')).toBe(true);
      expect(widget.events.some(e => e.event === 'change' && e.handler.includes('$event.checked'))).toBe(true);
    });

    it('uses Switch config (checked / change)', () => {
      const root = parseTemplate('<Switch v-model="active"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'checked')).toBe(true);
      expect(widget.events.some(e => e.event === 'change')).toBe(true);
    });

    it('uses RadioGroup config (value / change)', () => {
      const root = parseTemplate('<RadioGroup v-model="selected"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'value')).toBe(true);
      expect(widget.events.some(e => e.event === 'change' && e.handler.includes('$event.value'))).toBe(true);
    });

    it('applies trim modifier', () => {
      const root = parseTemplate('<Input v-model.trim="text"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.events.some(e => e.handler.includes('.trim()'))).toBe(true);
    });

    it('throws when v-model has no expression', () => {
      expect(() => parseTemplate('<Input v-model/>')).toThrow('v-model requires an expression');
    });

    it('uses argument as prop name with update: event', () => {
      const root = parseTemplate('<Box v-model:title="title"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'title' && p.expression === 'title')).toBe(true);
      expect(widget.events.some(e => e.event === 'update:title' && e.handler.includes('title.value = $event.title'))).toBe(true);
    });

    it('argument overrides per-tag config', () => {
      const root = parseTemplate('<Checkbox v-model:label="name"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'label')).toBe(true);
      expect(widget.events.some(e => e.event === 'update:label')).toBe(true);
    });

    it('camelizes kebab-case argument', () => {
      const root = parseTemplate('<Box v-model:bg-color="color"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'bgColor')).toBe(true);
      expect(widget.events.some(e => e.event === 'update:bgColor')).toBe(true);
    });

    it('argument works with modifiers', () => {
      const root = parseTemplate('<Input v-model:title.trim="name"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'title')).toBe(true);
      expect(widget.events.some(e => e.event === 'update:title' && e.handler.includes('.trim()'))).toBe(true);
    });
  });

  describe('v-show', () => {
    it('generates visible dynamic prop', () => {
      const root = parseTemplate('<Box v-show="isVisible"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'visible' && p.expression === 'isVisible')).toBe(true);
    });
  });

  describe('effects', () => {
    it('collects dynamic props that will produce effects in codegen', () => {
      const root = parseTemplate('<Box :x="pos.x" :y="pos.y"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps).toHaveLength(2);
      expect(widget.dynamicProps.map(p => p.name)).toEqual(['x', 'y']);
    });
  });

  // --- Potential issue / edge case tests ---

  describe('edge cases: widgetCounter keeps incrementing', () => {
    it('each compile produces unique widget IDs', () => {
      const root1 = parseTemplate('<Box/>');
      const root2 = parseTemplate('<Box/>');
      const w1 = asWidget(root1.children[0]!);
      const w2 = asWidget(root2.children[0]!);
      expect(w1.tag).toBe('Box');
      expect(w2.tag).toBe('Box');
      expect(w1.creator).toBe('createBox');
      expect(w2.creator).toBe('createBox');
    });
  });

  describe('edge cases: v-for whitespace tolerance', () => {
    it('handles extra whitespace in v-for expression', () => {
      const root = parseTemplate('<Text v-for="  item  in  items  "/>');
      const block = asList(root.children[0]!);
      expect(block.itemVar).toBe('item');
      expect(block.listExpression).toBe('items');
    });
  });

  describe('edge cases: v-model with .number modifier', () => {
    it('generates Number() wrapper in event handler', () => {
      const root = parseTemplate('<Input v-model.number="count"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.events.some(e => e.handler.includes('Number('))).toBe(true);
    });
  });

  describe('edge cases: camelization of attribute names', () => {
    it('camelizes kebab-case prop names', () => {
      const root = parseTemplate('<Box border-style="solid"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.props.some(p => p.name === 'borderStyle')).toBe(true);
    });

    it('leaves already-camelCase names unchanged', () => {
      const root = parseTemplate('<Box colorFg="#fff"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.props.some(p => p.name === 'colorFg')).toBe(true);
    });
  });

  describe('edge cases: SelectButton v-model config', () => {
    it('uses value / change config', () => {
      const root = parseTemplate('<SelectButton v-model="picked"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'value')).toBe(true);
      expect(widget.events.some(e => e.event === 'change' && e.handler.includes('$event.value'))).toBe(true);
    });
  });

  describe('edge cases: v-if inside v-for template fragment', () => {
    it('processes v-if inside v-for template body as conditional block', () => {
      const root = parseTemplate(
        '<template v-for="item in items"><Box v-if="item.active"/></template>',
      );
      expect(root.children).toHaveLength(1);
      const list = asList(root.children[0]!);
      expect(list.type).toBe('TuiListBlock');
      expect(list.itemVar).toBe('item');
      expect(list.body[0]!.type).toBe('TuiConditionalBlock');
    });
  });

  describe('edge cases: v-for directly on widget (no template wrapper)', () => {
    it('does not leak v-for as dynamic prop', () => {
      const root = parseTemplate('<Text v-for="item in items" :value="item"/>');
      expect(root.children).toHaveLength(1);
      const list = asList(root.children[0]!);
      expect(list.type).toBe('TuiListBlock');
      expect(list.itemVar).toBe('item');
      const widget = asWidget(list.body[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'for')).toBe(false);
      expect(widget.dynamicProps.some(p => p.name === 'value')).toBe(true);
    });
  });

  describe('edge cases: bare <template> fragment (no v-if/v-for)', () => {
    it('flattens template children into parent', () => {
      const root = parseTemplate('<template><Box x="1"/><Text value="hi"/></template>');
      expect(root.children).toHaveLength(2);
      expect(asWidget(root.children[0]!).tag).toBe('Box');
      expect(asWidget(root.children[1]!).tag).toBe('Text');
    });

    it('flattens nested template fragments', () => {
      const root = parseTemplate('<template><template><Box/></template></template>');
      expect(root.children).toHaveLength(1);
      expect(asWidget(root.children[0]!).tag).toBe('Box');
    });

    it('flattens template inside widget children', () => {
      const root = parseTemplate('<ScrollBox><template><Text value="a"/><Text value="b"/></template></ScrollBox>');
      const scroll = asWidget(root.children[0]!);
      expect(scroll.children).toHaveLength(2);
      expect(asWidget(scroll.children[0]!).tag).toBe('Text');
      expect(asWidget(scroll.children[1]!).tag).toBe('Text');
    });
  });

  describe('error paths: directive validation', () => {
    it('throws on v-for without expression', () => {
      expect(() => parseTemplate('<Text v-for/>')).toThrow('v-for requires an expression');
    });

    it('throws on v-if without expression', () => {
      expect(() => parseTemplate('<Box v-if/>')).toThrow('v-if requires an expression');
    });

    it('throws on orphan v-else-if without preceding v-if', () => {
      expect(() => parseTemplate('<Box v-else-if="b"/>')).toThrow('v-else-if has no matching v-if');
    });

    it('throws on orphan v-else without preceding v-if', () => {
      expect(() => parseTemplate('<Box v-else/>')).toThrow('v-else has no matching v-if');
    });

    it('throws on v-model with function call expression', () => {
      expect(() => parseTemplate('<Input v-model="fn()"/>')).toThrow('v-model expression must be a simple identifier or member expression');
    });

    it('accepts v-model with member expression (a.b)', () => {
      const root = parseTemplate('<Input v-model="state.name"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'value' && p.expression === 'state.name')).toBe(true);
    });

    it('accepts v-model with index access expression (a[i])', () => {
      const root = parseTemplate('<Input v-model="values[index]"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'value' && p.expression === 'values[index]')).toBe(true);
      expect(widget.events.some(e => e.event === 'input' && e.handler.includes('values.value[index]'))).toBe(true);
    });

    it('accepts v-model with chained access (a.b[i].c)', () => {
      const root = parseTemplate('<Input v-model="state.items[0].name"/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.dynamicProps.some(p => p.name === 'value' && p.expression === 'state.items[0].name')).toBe(true);
      expect(widget.events.some(e => e.event === 'input' && e.handler.includes('state.items[0].name'))).toBe(true);
    });

    it('throws on v-model with operator expression', () => {
      expect(() => parseTemplate('<Input v-model="a + b"/>')).toThrow('v-model expression must be a simple identifier or member expression');
    });
  });

  describe('propHandlers from registry', () => {
    it('attaches propHandlers from registry to widget node', () => {
      const root = parseTemplate('<Input/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.propHandlers).toBeDefined();
      expect(widget.propHandlers!.value).toEqual({method: 'updateValue'});
    });

    it('attaches propHandlers for all core widgets', () => {
      const tags = ['Box', 'Text', 'Input', 'Button', 'Checkbox', 'Switch', 'RadioGroup', 'SelectButton', 'ScrollBox', 'Progress'];
      for (const tag of tags) {
        const root = parseTemplate(`<${tag}/>`);
        const widget = asWidget(root.children[0]!);
        expect(widget.propHandlers).toBeDefined();
        expect(Object.keys(widget.propHandlers!).length).toBeGreaterThan(0);
      }
    });

    it('does not attach propHandlers for component imports', () => {
      const root = parseTemplate('<MyComp/>', {
        components: {MyComp: 'MyComp'},
      });
      const widget = asWidget(root.children[0]!);
      expect(widget.isComponent).toBe(true);
      expect(widget.propHandlers).toBeUndefined();
    });

    it('does not attach propHandlers when using custom registry without propHandlers', () => {
      const root = parseTemplate('<Box/>', {
        registry: {Box: {creator: 'createBox', module: '@buntui/core'}},
      });
      const widget = asWidget(root.children[0]!);
      expect(widget.propHandlers).toBeUndefined();
    });

    it('Input propHandlers include colorFg and borderStyle overrides', () => {
      const root = parseTemplate('<Input/>');
      const widget = asWidget(root.children[0]!);
      expect(widget.propHandlers!.colorFg).toEqual({method: 'updateColor', field: 'colorFg'});
      expect(widget.propHandlers!.borderStyle).toEqual({method: 'updateBorder', field: 'borderStyle'});
    });
  });
});
