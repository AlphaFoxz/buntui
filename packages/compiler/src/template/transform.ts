import {
  type RootNode,
  type TemplateChildNode,
  type ElementNode,
  type DirectiveNode,
  type AttributeNode,
  NodeTypes,
} from '@vue/compiler-core';
import {WIDGET_TAG_MAP} from '../runtime-helpers';
import type {
  TuiRenderRoot,
  TuiRenderNode,
  TuiWidgetCall,
  TuiStaticProp,
  TuiDynamicProp,
  TuiEventBinding,
  TuiReactiveEffect,
  TuiConditionalBlock,
} from './ast';

export type TransformOptions = {
  /** Known component names (in addition to WIDGET_TAG_MAP) */
  components?: Record<string, string>;
};

type TransformContext = {
  usedCreators: Set<string>;
  effects: TuiReactiveEffect[];
  options?: TransformOptions;
};

/**
 * Transform a Vue template AST root into a TUI render tree.
 */
export function transform(root: RootNode, options?: TransformOptions): TuiRenderRoot {
  const ctx: TransformContext = {
    usedCreators: new Set<string>(),
    effects: [],
    options,
  };
  const children: TuiRenderNode[] = [];

  let i = 0;
  while (i < root.children.length) {
    const node = root.children[i]!;

    if (node.type === NodeTypes.ELEMENT && findDirective(node, 'if')) {
      const {block, nextIndex} = processConditionalChain(node, root.children, i, ctx);
      children.push(block);
      i = nextIndex;
    } else {
      const transformed = transformNode(node, ctx);
      if (transformed) {
        children.push(transformed);
      }

      i++;
    }
  }

  return {
    type: 'TuiRenderRoot',
    children,
    effects: ctx.effects,
    usedCreators: ctx.usedCreators,
  };
}

function transformNode(
  node: TemplateChildNode,
  ctx: TransformContext,
): TuiRenderNode | undefined {
  if (node.type !== NodeTypes.ELEMENT) {
    // TODO: handle TextNode, InterpolationNode, CommentNode
    return undefined;
  }

  return transformElement(node, ctx);
}

let widgetCounter = 0;

function transformElement(
  node: ElementNode,
  ctx: TransformContext,
): TuiWidgetCall {
  const {tag} = node;
  const componentImport = ctx.options?.components?.[tag];

  const widgetId = `${tag.toLowerCase()}${widgetCounter++}`;
  const props: TuiStaticProp[] = [];
  const dynamicProps: TuiDynamicProp[] = [];
  const events: TuiEventBinding[] = [];

  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      props.push(transformStaticProp(prop));
    } else if (prop.type === NodeTypes.DIRECTIVE) {
      const results = transformDirective(prop, widgetId, tag);
      if (!results) {
        continue;
      }

      for (const result of results) {
        if (result.type === 'event') {
          events.push(result.binding);
        } else if (result.type === 'dynamic') {
          dynamicProps.push(result.binding);
        }
      }
    }
  }

  // Transform children recursively
  const children: TuiRenderNode[] = [];
  for (const child of node.children) {
    const transformed = transformNode(child, ctx);
    if (transformed) {
      children.push(transformed);
    }
  }

  // User component import takes priority over built-in widget map
  if (componentImport) {
    return {
      type: 'TuiWidgetCall',
      tag,
      creator: componentImport,
      isComponent: true,
      props,
      dynamicProps,
      events,
      children,
      loc: node.loc,
    };
  }

  const creator = WIDGET_TAG_MAP[tag];
  if (creator) {
    ctx.usedCreators.add(creator);
  } else {
    const known = [...Object.keys(WIDGET_TAG_MAP), ...Object.keys(ctx.options?.components ?? {})];
    // Throw new Error(`Unknown component <${tag}> at line ${node.loc.start.line}:${node.loc.start.column}. Known components: ${known.join(', ')}`);
    throw new Error(`Unknown component <${tag}> at line ${node.loc.start.line}:${node.loc.start.column}.`);
  }

  return {
    type: 'TuiWidgetCall',
    tag,
    creator,
    props,
    dynamicProps,
    events,
    children,
    loc: node.loc,
  };
}

function transformStaticProp(attr: AttributeNode): TuiStaticProp {
  return {
    type: 'TuiStaticProp',
    name: camelize(attr.name),
    value: attr.value?.content ?? 'true',
  };
}

type DirectiveResult
  = | {type: 'event'; binding: TuiEventBinding}
    | {type: 'dynamic'; binding: TuiDynamicProp};

function resolveArgContent(dir: DirectiveNode): string {
  if (!dir.arg) {
    return '';
  }

  if (dir.arg.type === NodeTypes.SIMPLE_EXPRESSION) {
    return camelize(dir.arg.content);
  }

  return '';
}

function resolveExpContent(dir: DirectiveNode): string {
  if (!dir.exp) {
    return '';
  }

  if (dir.exp.type === NodeTypes.SIMPLE_EXPRESSION) {
    return dir.exp.content;
  }

  return '';
}

/**
 * Per-tag v-model configuration: which prop to bind and which event to listen to.
 * Tags not listed here fall back to {prop: 'value', event: 'input', payloadKey: 'value'}.
 */
const V_MODEL_TAG_CONFIG: Record<string, {prop: string; event: string; payloadKey: string}> = {
  Checkbox: {prop: 'checked', event: 'change', payloadKey: 'checked'},
  Switch: {prop: 'checked', event: 'change', payloadKey: 'checked'},
  RadioGroup: {prop: 'value', event: 'change', payloadKey: 'value'},
  SelectButton: {prop: 'value', event: 'change', payloadKey: 'value'},
};

const V_MODEL_DEFAULT_CONFIG = {prop: 'value', event: 'input', payloadKey: 'value'} as const;

/**
 * Apply a known v-model modifier transform to an expression string.
 */
function applyModifier(mod: string, raw: string): string {
  if (mod === 'trim') {
    return `${raw}.trim()`;
  }

  if (mod === 'number') {
    return `Number(${raw})`;
  }

  return raw;
}

function transformDirective(dir: DirectiveNode, _widgetId: string, tag?: string): DirectiveResult[] | undefined {
  // Skip v-if / v-else-if / v-else — handled by processConditionalChain
  if (dir.name === 'if' || dir.name === 'else-if' || dir.name === 'else') {
    return undefined;
  }

  // V-model: generates prop binding + event write-back, with per-tag and modifier support
  if (dir.name === 'model') {
    if (!dir.exp) {
      throw new Error(`v-model requires an expression (e.g. v-model="foo") at ${dir.loc.start.line}:${dir.loc.start.column}`);
    }

    if (dir.exp.type !== NodeTypes.SIMPLE_EXPRESSION) {
      throw new Error(`v-model expression must be a simple identifier or member expression at ${dir.loc.start.line}:${dir.loc.start.column}`);
    }

    const expression = dir.exp.content;
    const config = (tag !== undefined && Object.hasOwn(V_MODEL_TAG_CONFIG, tag))
      ? V_MODEL_TAG_CONFIG[tag]!
      : V_MODEL_DEFAULT_CONFIG;

    // Build the assignment value, applying modifiers in order
    let valueExpr = `$event.${config.payloadKey}`;
    if (dir.modifiers.length > 0) {
      for (const mod of dir.modifiers) {
        valueExpr = applyModifier(mod.content, valueExpr);
      }
    }

    return [
      {
        type: 'dynamic',
        binding: {
          type: 'TuiDynamicProp',
          name: config.prop,
          expression,
          loc: dir.loc,
        },
      },
      {
        type: 'event',
        binding: {
          type: 'TuiEventBinding',
          event: config.event,
          handler: `($event) => { ${expression}.value = ${valueExpr} }`,
          loc: dir.loc,
        },
      },
    ];
  }

  // V-on: event binding
  if (dir.name === 'on' && dir.arg) {
    const event = resolveArgContent(dir);
    const handler = resolveExpContent(dir);
    return [{
      type: 'event',
      binding: {
        type: 'TuiEventBinding',
        event,
        handler,
        loc: dir.loc,
      },
    }];
  }

  // V-bind / : shorthand — dynamic prop
  if (dir.name === 'bind' && dir.arg) {
    const name = resolveArgContent(dir);
    const expression = resolveExpContent(dir);
    return [{
      type: 'dynamic',
      binding: {
        type: 'TuiDynamicProp',
        name,
        expression,
        loc: dir.loc,
      },
    }];
  }

  // Fallback: treat as dynamic prop for unknown directives
  return [{
    type: 'dynamic',
    binding: {
      type: 'TuiDynamicProp',
      name: dir.name,
      expression: resolveExpContent(dir),
      loc: dir.loc,
    },
  }];
}

function findDirective(node: ElementNode, name: string): DirectiveNode | undefined {
  for (const prop of node.props) {
    if (prop.type === NodeTypes.DIRECTIVE && prop.name === name) {
      return prop;
    }
  }

  return undefined;
}

function processConditionalChain(
  firstElement: ElementNode,
  siblings: readonly TemplateChildNode[],
  startIndex: number,
  ctx: TransformContext,
): {block: TuiConditionalBlock; nextIndex: number} {
  const vIfDir = findDirective(firstElement, 'if')!;

  const consequentWidget = transformElement(firstElement, ctx);
  const block: TuiConditionalBlock = {
    type: 'TuiConditionalBlock',
    condition: resolveExpContent(vIfDir),
    consequent: [consequentWidget],
    loc: firstElement.loc,
  };

  let current = block;
  let i = startIndex + 1;

  while (i < siblings.length) {
    const sibling = siblings[i]!;
    if (sibling.type !== NodeTypes.ELEMENT) {
      break;
    }

    const vElseIf = findDirective(sibling, 'else-if');
    if (vElseIf) {
      const altWidget = transformElement(sibling, ctx);
      const altBlock: TuiConditionalBlock = {
        type: 'TuiConditionalBlock',
        condition: resolveExpContent(vElseIf),
        consequent: [altWidget],
        loc: sibling.loc,
      };
      current.alternate = altBlock;
      current = altBlock;
      i++;
      continue;
    }

    const vElse = findDirective(sibling, 'else');
    if (vElse) {
      const altWidget = transformElement(sibling, ctx);
      current.alternate = [altWidget];
      i++;
      break;
    }

    break;
  }

  return {block, nextIndex: i};
}

function camelize(value: string): string {
  return value.replaceAll(/-([a-z])/gv, (_, c: string) => c.toUpperCase());
}
