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

/**
 * Transform a Vue template AST root into a TUI render tree.
 */
export function transform(root: RootNode, _options?: TransformOptions): TuiRenderRoot {
  const usedCreators = new Set<string>();
  const effects: TuiReactiveEffect[] = [];
  const children: TuiRenderNode[] = [];

  let i = 0;
  while (i < root.children.length) {
    const node = root.children[i]!;

    if (node.type === NodeTypes.ELEMENT && findDirective(node, 'if')) {
      const {block, nextIndex} = processConditionalChain(node, root.children, i, usedCreators);
      children.push(block);
      i = nextIndex;
    } else {
      const transformed = transformNode(node, usedCreators, effects);
      if (transformed) {
        children.push(transformed);
      }

      i++;
    }
  }

  return {
    type: 'TuiRenderRoot',
    children,
    effects,
    usedCreators,
  };
}

function transformNode(
  node: TemplateChildNode,
  usedCreators: Set<string>,
  _effects: TuiReactiveEffect[],
): TuiRenderNode | undefined {
  if (node.type !== NodeTypes.ELEMENT) {
    // TODO: handle TextNode, InterpolationNode, CommentNode
    return undefined;
  }

  return transformElement(node, usedCreators);
}

let widgetCounter = 0;

function transformElement(
  node: ElementNode,
  usedCreators: Set<string>,
): TuiWidgetCall {
  const {tag} = node;
  const creator = WIDGET_TAG_MAP[tag];
  if (creator) {
    usedCreators.add(creator);
  }

  const widgetId = `${tag.toLowerCase()}${widgetCounter++}`;
  const props: TuiStaticProp[] = [];
  const dynamicProps: TuiDynamicProp[] = [];
  const events: TuiEventBinding[] = [];

  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      props.push(transformStaticProp(prop));
    } else if (prop.type === NodeTypes.DIRECTIVE) {
      const result = transformDirective(prop, widgetId);
      if (!result) {
        continue;
      }

      if (result.type === 'event') {
        events.push(result.binding);
      } else if (result.type === 'dynamic') {
        dynamicProps.push(result.binding);
      }
    }
  }

  // TODO: handle children (recursive transform)
  // TODO: handle v-if, v-for (wrap in conditional/list blocks)

  return {
    type: 'TuiWidgetCall',
    tag,
    creator: creator ?? tag,
    props,
    dynamicProps,
    events,
    children: [],
    loc: node.loc,
  };
}

function transformStaticProp(attr: AttributeNode): TuiStaticProp {
  return {
    type: 'TuiStaticProp',
    name: attr.name,
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
    return dir.arg.content;
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

function transformDirective(dir: DirectiveNode, _widgetId: string): DirectiveResult | undefined {
  // Skip v-if / v-else-if / v-else — handled by processConditionalChain
  if (dir.name === 'if' || dir.name === 'else-if' || dir.name === 'else') {
    return undefined;
  }

  // V-on: event binding
  if (dir.name === 'on' && dir.arg) {
    const event = resolveArgContent(dir);
    const handler = resolveExpContent(dir);
    return {
      type: 'event',
      binding: {
        type: 'TuiEventBinding',
        event,
        handler,
        loc: dir.loc,
      },
    };
  }

  // V-bind / : shorthand — dynamic prop
  if (dir.name === 'bind' && dir.arg) {
    const name = resolveArgContent(dir);
    const expression = resolveExpContent(dir);
    return {
      type: 'dynamic',
      binding: {
        type: 'TuiDynamicProp',
        name,
        expression,
        loc: dir.loc,
      },
    };
  }

  // Fallback: treat as dynamic prop for unknown directives
  return {
    type: 'dynamic',
    binding: {
      type: 'TuiDynamicProp',
      name: dir.name,
      expression: resolveExpContent(dir),
      loc: dir.loc,
    },
  };
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
  usedCreators: Set<string>,
): {block: TuiConditionalBlock; nextIndex: number} {
  const vIfDir = findDirective(firstElement, 'if')!;

  const consequentWidget = transformElement(firstElement, usedCreators);
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
      const altWidget = transformElement(sibling, usedCreators);
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
      const altWidget = transformElement(sibling, usedCreators);
      current.alternate = [altWidget];
      i++;
      break;
    }

    break;
  }

  return {block, nextIndex: i};
}
