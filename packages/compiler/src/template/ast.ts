import type {SourceLocation} from '@vue/compiler-core';
import type {PropHandler} from '../runtime-helpers';

/**
 * TUI widget creation call in the generated render function.
 * e.g. `createBox({ text: 'Hello', x: 10 })`
 */
export type TuiWidgetCall = {
  readonly type: 'TuiWidgetCall';
  /** The tag name from template, e.g. "Box" */
  tag: string;
  /** Resolved creator function name, e.g. "createBox" */
  creator: string;
  /** True when this tag resolves to an imported .vue component */
  isComponent?: boolean;
  /** Static props (known at compile time) */
  props: TuiStaticProp[];
  /** Dynamic props (bound to reactive expressions) */
  dynamicProps: TuiDynamicProp[];
  /** Event handler bindings */
  events: TuiEventBinding[];
  /** Children (nested widgets) */
  children: TuiRenderNode[];
  /** Template ref name from ref="xxx" attribute */
  refName?: string;
  /** Per-widget prop → handler mappings from registry (undefined for unregistered widgets) */
  propHandlers?: Record<string, PropHandler>;
  /** Source location for error reporting */
  loc: SourceLocation;
};

/**
 * A static prop known at compile time.
 * e.g. `x={10}` or `text="Hello"`
 */
export type TuiStaticProp = {
  readonly type: 'TuiStaticProp';
  name: string;
  value: string;
};

/**
 * A dynamic prop bound to a JS expression.
 * e.g. `:text="message"` or `v-bind:x="pos.x"`
 */
export type TuiDynamicProp = {
  readonly type: 'TuiDynamicProp';
  name: string;
  expression: string;
  loc: SourceLocation;
};

/**
 * An event handler binding.
 * e.g. `@key="handleKey"` or `@click="onClick"`
 */
export type TuiEventBinding = {
  readonly type: 'TuiEventBinding';
  event: string;
  handler: string;
  modifiers: string[];
  loc: SourceLocation;
};

/**
 * A reactive effect that updates a widget prop when dependencies change.
 * e.g. `effect(() => { text0.updateText(count.value) })`
 */
export type TuiReactiveEffect = {
  readonly type: 'TuiReactiveEffect';
  widgetId: string;
  updateMethod: string;
  expression: string;
};

/**
 * A conditional render block (v-if / v-else-if / v-else).
 */
export type TuiConditionalBlock = {
  readonly type: 'TuiConditionalBlock';
  condition: string;
  /** Widgets to mount when condition is true */
  consequent: TuiRenderNode[];
  /** Widgets for else branch (v-else-if / v-else) */
  alternate?: TuiConditionalBlock | TuiRenderNode[];
  loc: SourceLocation;
};

/**
 * A list render block (v-for).
 */
export type TuiListBlock = {
  readonly type: 'TuiListBlock';
  /** E.g. "item in items" or "(item, index) in items" */
  itemVar: string;
  indexVar?: string;
  listExpression: string;
  /** Key expression from :key="expr", enables reactive keyed diffing */
  keyExpression?: string;
  /** Body template to repeat */
  body: TuiRenderNode[];
  loc: SourceLocation;
};

/**
 * Union of all TUI render AST nodes.
 */
export type TuiRenderNode
  = | TuiWidgetCall
    | TuiConditionalBlock
    | TuiListBlock;

/**
 * The root of a compiled TUI render tree.
 */
export type TuiRenderRoot = {
  readonly type: 'TuiRenderRoot';
  /** Top-level nodes in the template */
  children: TuiRenderNode[];
  /** Reactive effects needed for dynamic bindings */
  effects: TuiReactiveEffect[];
  /** All widget creators used (for import generation) */
  usedCreators: Set<string>;
  /** Creator → module mapping (filled during transform from registry) */
  usedModules: Map<string, string>;
};

