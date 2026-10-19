import {describe, it, expect} from 'bun:test';
import {generate} from '../template/codegen';
import {CORE_REGISTRY} from '../runtime-helpers';
import type {
  TuiRenderRoot,
  TuiWidgetCall,
  TuiConditionalBlock,
  TuiListBlock,
  TuiDynamicComponent,
  TuiRenderNode,
  TuiReactiveEffect,
} from '../template/ast';
import type {SourceLocation} from '@vue/compiler-core';

const STUB_LOC: SourceLocation = {
  start: {offset: 0, line: 1, column: 0},
  end: {offset: 0, line: 1, column: 0},
  source: '',
};

function makeRoot(
  children: TuiRenderNode[] = [],
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

function makeConditional(overrides: Partial<TuiConditionalBlock> = {}): TuiConditionalBlock {
  return {
    type: 'TuiConditionalBlock',
    condition: 'flag',
    consequent: [],
    loc: STUB_LOC,
    ...overrides,
  };
}

function makeList(overrides: Partial<TuiListBlock> = {}): TuiListBlock {
  return {
    type: 'TuiListBlock',
    itemVar: 'item',
    listExpression: 'items',
    body: [],
    loc: STUB_LOC,
    ...overrides,
  };
}

function makeDynamicComponent(overrides: Partial<TuiDynamicComponent> = {}): TuiDynamicComponent {
  return {
    type: 'TuiDynamicComponent',
    isExpression: 'Window',
    props: [],
    dynamicProps: [],
    events: [],
    loc: STUB_LOC,
    ...overrides,
  };
}

function dynProp(name: string, expression: string) {
  return {type: 'TuiDynamicProp' as const, name, expression, loc: STUB_LOC};
}

function staticProp(name: string, value: string) {
  return {type: 'TuiStaticProp' as const, name, value};
}

function event(event_: string, handler = 'onEvent', modifiers: string[] = []) {
  return {type: 'TuiEventBinding' as const, event: event_, handler, modifiers, loc: STUB_LOC};
}

const CREATORS = new Set(['createBox', 'createTextWidget', 'createButtonWidget']);
const MODULES = new Map([
  ['createBox', '@buntui/core'],
  ['createTextWidget', '@buntui/core'],
  ['createButtonWidget', '@buntui/core'],
]);

describe('codegen snapshots (refactor safety net)', () => {
  it('static tree: nested children, static props, boolean flags, events, ref', () => {
    const tree = makeRoot(
      [
        makeWidget({
          tag: 'Box',
          props: [staticProp('direction', 'column'), staticProp('readonly', 'true'), staticProp('title', 'hello')],
          events: [event('click', 'handleClick', ['stop']), event('key', 'onKey', ['enter'])],
          refName: 'boxRef',
          propHandlers: CORE_REGISTRY.Box?.propHandlers,
          children: [
            makeWidget({
              tag: 'Text',
              creator: 'createTextWidget',
              props: [staticProp('value', 'child text')],
              propHandlers: CORE_REGISTRY.Text?.propHandlers,
            }),
            makeWidget({
              tag: 'Button',
              creator: 'createButtonWidget',
              props: [staticProp('value', 'OK'), staticProp('disabled', 'false')],
              propHandlers: CORE_REGISTRY.Button?.propHandlers,
            }),
          ],
        }),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('dynamic props: reactive effects per prop', () => {
    const tree = makeRoot(
      [
        makeWidget({
          tag: 'Box',
          dynamicProps: [dynProp('x', 'pos.x'), dynProp('y', 'pos.y'), dynProp('visible', 'isVisible')],
          propHandlers: CORE_REGISTRY.Box?.propHandlers,
        }),
        makeWidget({
          tag: 'Text',
          creator: 'createTextWidget',
          dynamicProps: [dynProp('value', 'message')],
          propHandlers: CORE_REGISTRY.Text?.propHandlers,
        }),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('conditional: if / else-if / else with children', () => {
    const tree = makeRoot(
      [
        makeConditional({
          condition: 'mode === "a"',
          consequent: [
            makeWidget({
              tag: 'Text',
              creator: 'createTextWidget',
              props: [staticProp('value', 'branch a')],
              propHandlers: CORE_REGISTRY.Text?.propHandlers,
            }),
          ],
          alternate: makeConditional({
            condition: 'mode === "b"',
            consequent: [makeWidget({tag: 'Button', creator: 'createButtonWidget', props: [staticProp('value', 'branch b')]})],
            alternate: [makeWidget({tag: 'Text', creator: 'createTextWidget', props: [staticProp('value', 'fallback')]})],
          }),
        }),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('conditional: without else emits final unmount branch', () => {
    const tree = makeRoot(
      [
        makeConditional({
          condition: 'show',
          consequent: [makeWidget({tag: 'Text', creator: 'createTextWidget', props: [staticProp('value', 'shown')]})],
        }),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('conditional: nested children inside branches', () => {
    const tree = makeRoot(
      [
        makeConditional({
          condition: 'open',
          consequent: [
            makeWidget({
              tag: 'Box',
              children: [
                makeWidget({tag: 'Text', creator: 'createTextWidget', props: [staticProp('value', 'inner')]}),
              ],
            }),
          ],
        }),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('static list: array without index', () => {
    const tree = makeRoot(
      [
        makeList({
          itemVar: 'item',
          listExpression: 'items',
          body: [makeWidget({tag: 'Text', creator: 'createTextWidget', props: [staticProp('value', 'row')]})],
        }),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('static list: array with index uses entries()', () => {
    const tree = makeRoot(
      [
        makeList({
          itemVar: 'item',
          indexVar: 'idx',
          listExpression: 'items',
          body: [makeWidget({tag: 'Text', creator: 'createTextWidget', props: [staticProp('value', 'row')]})],
        }),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('static list: numeric range', () => {
    const tree = makeRoot(
      [
        makeList({
          itemVar: 'i',
          listExpression: '20',
          body: [makeWidget({tag: 'Text', creator: 'createTextWidget', props: [staticProp('value', 'cell')]})],
        }),
        makeList({
          itemVar: 'item',
          indexVar: 'idx',
          listExpression: '10',
          body: [makeWidget({tag: 'Text', creator: 'createTextWidget', props: [staticProp('value', 'cell')]})],
        }),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('keyed list: diff path with create, update and reuse branches', () => {
    const tree = makeRoot(
      [
        makeList({
          itemVar: 'item',
          listExpression: 'rows',
          keyExpression: 'item.id',
          body: [
            makeWidget({
              tag: 'Text',
              creator: 'createTextWidget',
              props: [staticProp('value', 'static')],
              dynamicProps: [dynProp('value', 'item.label')],
              propHandlers: CORE_REGISTRY.Text?.propHandlers,
              events: [event('click', 'rowClick')],
              children: [makeWidget({tag: 'Text', creator: 'createTextWidget', props: [staticProp('value', 'sub')]})],
            }),
          ],
        }),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('keyed list: numeric range and nested conditional', () => {
    const tree = makeRoot(
      [
        makeList({
          itemVar: 'i',
          listExpression: '5',
          keyExpression: 'i',
          body: [
            makeConditional({
              condition: 'i % 2 === 0',
              consequent: [makeWidget({tag: 'Text', creator: 'createTextWidget', props: [staticProp('value', 'even')]})],
            }),
          ],
        }),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('dynamic component: plain :is', () => {
    const tree = makeRoot([makeDynamicComponent({isExpression: 'current'})], [], new Set(['createBox']), MODULES);
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('dynamic component: with static and dynamic props', () => {
    const tree = makeRoot(
      [makeDynamicComponent({isExpression: 'current', props: [staticProp('title', 'win')], dynamicProps: [dynProp('value', 'msg')]})],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('component: static props only', () => {
    const tree = makeRoot(
      [makeWidget({tag: 'Window', creator: 'Window', isComponent: true, props: [staticProp('title', 'demo')]})],
      [],
      new Set(['Window']),
      new Map([['Window', './Window.vue']]),
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('component: dynamic props produce reactive props object', () => {
    const tree = makeRoot(
      [
        makeWidget({
          tag: 'Window',
          creator: 'Window',
          isComponent: true,
          props: [staticProp('title', 'demo')],
          dynamicProps: [dynProp('value', 'msg'), dynProp('visible', 'isVisible')],
        }),
      ],
      [],
      new Set(['Window']),
      new Map([['Window', './Window.vue']]),
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('component: v-show produces proxy mount target', () => {
    const tree = makeRoot(
      [
        makeWidget({
          tag: 'Window',
          creator: 'Window',
          isComponent: true,
          dynamicProps: [dynProp('visible', 'isVisible')],
        }),
      ],
      [],
      new Set(['Window']),
      new Map([['Window', './Window.vue']]),
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('mixed tree: declarative widgets mount before deferred blocks', () => {
    const tree = makeRoot(
      [
        makeWidget({tag: 'Box'}),
        makeWidget({tag: 'Window', creator: 'Window', isComponent: true}),
        makeConditional({condition: 'show', consequent: [makeWidget({tag: 'Text', creator: 'createTextWidget'})]}),
        makeWidget({tag: 'Button', creator: 'createButtonWidget'}),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });

  it('full composite: everything together', () => {
    const tree = makeRoot(
      [
        makeWidget({
          tag: 'Box',
          props: [staticProp('direction', 'column')],
          dynamicProps: [dynProp('visible', 'uiOpen')],
          propHandlers: CORE_REGISTRY.Box?.propHandlers,
          children: [
            makeList({
              itemVar: 'item',
              indexVar: 'idx',
              listExpression: 'items',
              keyExpression: 'item.id',
              body: [
                makeWidget({
                  tag: 'Button',
                  creator: 'createButtonWidget',
                  dynamicProps: [dynProp('value', 'item.label')],
                  propHandlers: CORE_REGISTRY.Button?.propHandlers,
                }),
              ],
            }),
            makeConditional({
              condition: 'hasSelection',
              consequent: [makeWidget({tag: 'Text', creator: 'createTextWidget', props: [staticProp('value', 'selected')]})],
            }),
            makeWidget({tag: 'Window', creator: 'Window', isComponent: true, props: [staticProp('title', 'child window')]}),
          ],
        }),
      ],
      [],
      CREATORS,
      MODULES,
    );
    expect(generate(tree).code).toMatchSnapshot();
  });
});
