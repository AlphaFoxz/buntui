/* eslint-disable max-depth */
import {
  type RootNode,
  type TemplateChildNode,
  type ElementNode,
  type DirectiveNode,
  type AttributeNode,
  NodeTypes,
} from '@vue/compiler-core';
import {type TuiComponentRegistry, CORE_REGISTRY} from '../runtime-helpers';
import type {
  TuiRenderRoot,
  TuiRenderNode,
  TuiWidgetCall,
  TuiStaticProp,
  TuiDynamicProp,
  TuiEventBinding,
  TuiReactiveEffect,
  TuiConditionalBlock,
  TuiListBlock,
} from './ast';

export type TransformOptions = {
  /** Component registry: tag name → {creator, module}. Defaults to CORE_REGISTRY. */
  registry?: TuiComponentRegistry;
  /** .vue component imports detected from <script setup> (tag → identifier) */
  components?: Record<string, string>;
  /** Widget tag-named imports detected from <script setup> (tag → local identifier) */
  widgetImports?: Record<string, string>;
};

type TransformContext = {
  usedCreators: Set<string>;
  usedModules: Map<string, string>;
  effects: TuiReactiveEffect[];
  registry: TuiComponentRegistry;
  components: Record<string, string>;
  widgetImports: Record<string, string>;
  widgetCounter: number;
};

/**
 * Transform a Vue template AST root into a TUI render tree.
 */
export function transform(root: RootNode, options?: TransformOptions): TuiRenderRoot {
  const ctx: TransformContext = {
    usedCreators: new Set<string>(),
    usedModules: new Map<string, string>(),
    effects: [],
    registry: options?.registry ?? CORE_REGISTRY,
    components: options?.components ?? {},
    widgetImports: options?.widgetImports ?? {},
    widgetCounter: 0,
  };
  const children: TuiRenderNode[] = [];

  let i = 0;
  while (i < root.children.length) {
    const node = root.children[i]!;

    if (node.type === NodeTypes.ELEMENT && findDirective(node, 'if')) {
      const {block, nextIndex} = processConditionalChain(node, root.children, i, ctx);
      children.push(block);
      i = nextIndex;
    } else if (node.type === NodeTypes.ELEMENT && findDirective(node, 'for')) {
      const listBlock = processListBlock(node, ctx);
      children.push(listBlock);
      i++;
    } else if (node.type === NodeTypes.ELEMENT && node.tag === 'template') {
      const fragment = processFragment(node, ctx);
      children.push(...fragment);
      i++;
    } else {
      if (node.type === NodeTypes.ELEMENT) {
        checkOrphanDirective(node);
      }

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
    usedModules: ctx.usedModules,
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

function transformElement(
  node: ElementNode,
  ctx: TransformContext,
): TuiWidgetCall {
  const {tag} = node;

  const widgetId = `${tag.toLowerCase()}${ctx.widgetCounter++}`;
  const props: TuiStaticProp[] = [];
  const dynamicProps: TuiDynamicProp[] = [];
  const events: TuiEventBinding[] = [];

  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      props.push(...transformStaticProp(prop));
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

  let refName: string | undefined;
  const refIndex = props.findIndex(p => p.name === 'ref');
  if (refIndex !== -1) {
    refName = props[refIndex]!.value;
    props.splice(refIndex, 1);
  }

  const keyIndex = props.findIndex(p => p.name === 'key');
  if (keyIndex !== -1) {
    props.splice(keyIndex, 1);
  }

  // Transform children recursively
  const children: TuiRenderNode[] = [];
  let childIdx = 0;
  const childNodes = node.children as readonly TemplateChildNode[];
  while (childIdx < childNodes.length) {
    const child = childNodes[childIdx]!;
    if (child.type === NodeTypes.ELEMENT && findDirective(child, 'if')) {
      const {block, nextIndex} = processConditionalChain(child, childNodes, childIdx, ctx);
      children.push(block);
      childIdx = nextIndex;
    } else if (child.type === NodeTypes.ELEMENT && findDirective(child, 'for')) {
      children.push(processListBlock(child, ctx));
      childIdx++;
    } else if (child.type === NodeTypes.ELEMENT && child.tag === 'template') {
      children.push(...processFragment(child, ctx));
      childIdx++;
    } else {
      if (child.type === NodeTypes.ELEMENT) {
        checkOrphanDirective(child);
      }

      const transformed = transformNode(child, ctx);
      if (transformed) {
        children.push(transformed);
      }

      childIdx++;
    }
  }

  // User .vue component import takes priority
  const componentImport = ctx.components[tag];
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
      refName,
      loc: node.loc,
    };
  }

  // Explicit widget import (e.g. import {Matrix} from '@buntui/extensions')
  // Uses the local identifier as creator — no codegen import needed
  const widgetImport = ctx.widgetImports[tag];
  if (widgetImport) {
    return {
      type: 'TuiWidgetCall',
      tag,
      creator: widgetImport,
      props,
      dynamicProps,
      events,
      children,
      refName,
      loc: node.loc,
    };
  }

  // Registry lookup (core + extensions + custom)
  const entry = ctx.registry[tag];
  if (entry) {
    ctx.usedCreators.add(entry.creator);
    ctx.usedModules.set(entry.creator, entry.module);
  } else {
    throw new Error(`Unknown component <${tag}> at line ${node.loc.start.line}:${node.loc.start.column}.`);
  }

  return {
    type: 'TuiWidgetCall',
    tag,
    creator: entry.creator,
    props,
    dynamicProps,
    events,
    children,
    refName,
    propHandlers: entry.propHandlers,
    loc: node.loc,
  };
}

function transformStaticProp(attr: AttributeNode): TuiStaticProp[] {
  const name = camelize(attr.name);
  const value = attr.value?.content ?? 'true';

  return [{type: 'TuiStaticProp', name, value}];
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
  Select: {prop: 'value', event: 'change', payloadKey: 'value'},
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

function isValidModelExpression(expr: string): boolean {
  let i = 0;
  if (i >= expr.length || !/[a-zA-Z_$]/v.test(expr[i]!)) {
    return false;
  }

  while (i < expr.length && /[\w$]/v.test(expr[i]!)) {
    i++;
  }

  while (i < expr.length) {
    if (expr[i] === '.') {
      i++;
      if (i >= expr.length || !/[a-zA-Z_$]/v.test(expr[i]!)) {
        return false;
      }

      while (i < expr.length && /[\w$]/v.test(expr[i]!)) {
        i++;
      }
    } else if (expr[i] === '[') {
      i++;
      let depth = 1;
      while (i < expr.length && depth > 0) {
        const ch = expr[i]!;
        switch (ch) {
          case '[': {
            depth++;

            break;
          }

          case ']': {
            depth--;

            break;
          }

          case '\'':
          case '"': {
            i++;
            while (i < expr.length && expr[i] !== ch) {
              if (expr[i] === '\\') {
                i++;
              }

              i++;
            }

            if (i >= expr.length) {
              return false;
            }

            break;
          }

          default: {
            break;
          }
        }

        i++;
      }

      if (depth !== 0) {
        return false;
      }
    } else {
      return false;
    }
  }

  return true;
}

function transformDirective(dir: DirectiveNode, _widgetId: string, tag?: string): DirectiveResult[] | undefined {
  if (dir.name === 'if' || dir.name === 'else-if' || dir.name === 'else' || dir.name === 'for') {
    return undefined;
  }

  // V-show: toggle visibility without destroying the widget
  if (dir.name === 'show') {
    return [{
      type: 'dynamic',
      binding: {
        type: 'TuiDynamicProp',
        name: 'visible',
        expression: resolveExpContent(dir),
        loc: dir.loc,
      },
    }];
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

    if (!isValidModelExpression(expression)) {
      throw new Error(`v-model expression must be a simple identifier or member expression at ${dir.loc.start.line}:${dir.loc.start.column}`);
    }

    const argName = dir.arg?.type === NodeTypes.SIMPLE_EXPRESSION
      ? camelize(dir.arg.content)
      : undefined;

    let config: {prop: string; event: string; payloadKey: string};
    if (argName) {
      config = {prop: argName, event: `update:${argName}`, payloadKey: argName};
    } else if (tag !== undefined && Object.hasOwn(V_MODEL_TAG_CONFIG, tag)) {
      config = V_MODEL_TAG_CONFIG[tag]!;
    } else {
      config = V_MODEL_DEFAULT_CONFIG;
    }

    // Build the assignment value, applying modifiers in order
    let valueExpr = `$event.${config.payloadKey}`;
    if (dir.modifiers.length > 0) {
      for (const mod of dir.modifiers) {
        valueExpr = applyModifier(mod.content, valueExpr);
      }
    }

    const isSimpleIdentifier = /^[a-zA-Z_$][\w$]*$/v.test(expression);
    const refIndexMatch = /^[a-zA-Z_$][\w$]*(\[)/v.exec(expression);
    let assignment: string;
    if (isSimpleIdentifier) {
      assignment = `${expression}.value = ${valueExpr}`;
    } else if (refIndexMatch) {
      const root = refIndexMatch[0].slice(0, -1);
      const rest = expression.slice(root.length);
      assignment = `${root}.value${rest} = ${valueExpr}`;
    } else {
      assignment = `${expression} = ${valueExpr}`;
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
          handler: `($event) => { ${assignment} }`,
          modifiers: [],
          loc: dir.loc,
        },
      },
    ];
  }

  // V-on: event binding
  if (dir.name === 'on' && dir.arg) {
    const event = resolveArgContent(dir);
    const handler = resolveExpContent(dir);
    const modifiers = dir.modifiers.map(m => m.content);
    return [{
      type: 'event',
      binding: {
        type: 'TuiEventBinding',
        event,
        handler,
        modifiers,
        loc: dir.loc,
      },
    }];
  }

  // V-bind / : shorthand — dynamic prop
  if (dir.name === 'bind' && dir.arg) {
    const name = resolveArgContent(dir);
    if (name === 'key') {
      return undefined;
    }

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

function checkOrphanDirective(node: ElementNode): void {
  const elseIf = findDirective(node, 'else-if');
  if (elseIf) {
    throw new Error(`v-else-if has no matching v-if at ${elseIf.loc.start.line}:${elseIf.loc.start.column}`);
  }

  const vElse = findDirective(node, 'else');
  if (vElse) {
    throw new Error(`v-else has no matching v-if at ${vElse.loc.start.line}:${vElse.loc.start.column}`);
  }
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
  if (!vIfDir.exp) {
    throw new Error(`v-if requires an expression at ${firstElement.loc.start.line}:${firstElement.loc.start.column}`);
  }

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

/**
 * Parse v-for expression like "item in items" or "(item, index) in items".
 */
function parseForExpression(exp: string): {itemVar: string; indexVar?: string; listExpression: string} {
  const match = /^\s*(?:\(\s*(\w+)\s*,\s*(\w+)\s*\)|(\w+))\s+in\s+(.+)$/sv.exec(exp);
  if (!match) {
    throw new Error(`Invalid v-for expression: "${exp}"`);
  }

  if (match[1] && match[2]) {
    return {itemVar: match[1], indexVar: match[2], listExpression: match[4]!.trim()};
  }

  return {itemVar: match[3]!, listExpression: match[4]!.trim()};
}

function processFragment(
  node: ElementNode,
  ctx: TransformContext,
): TuiRenderNode[] {
  const result: TuiRenderNode[] = [];
  const childNodes = node.children as readonly TemplateChildNode[];
  let i = 0;
  while (i < childNodes.length) {
    const child = childNodes[i]!;
    if (child.type === NodeTypes.ELEMENT && findDirective(child, 'if')) {
      const {block, nextIndex} = processConditionalChain(child, childNodes, i, ctx);
      result.push(block);
      i = nextIndex;
    } else if (child.type === NodeTypes.ELEMENT && findDirective(child, 'for')) {
      result.push(processListBlock(child, ctx));
      i++;
    } else if (child.type === NodeTypes.ELEMENT && child.tag === 'template') {
      result.push(...processFragment(child, ctx));
      i++;
    } else {
      if (child.type === NodeTypes.ELEMENT) {
        checkOrphanDirective(child);
      }

      const transformed = transformNode(child, ctx);
      if (transformed) {
        result.push(transformed);
      }

      i++;
    }
  }

  return result;
}

function processListBlock(
  node: ElementNode,
  ctx: TransformContext,
): TuiListBlock {
  const vForDir = findDirective(node, 'for')!;
  if (!vForDir.exp?.type || vForDir.exp.type !== NodeTypes.SIMPLE_EXPRESSION) {
    throw new Error(`v-for requires an expression at ${node.loc.start.line}:${node.loc.start.column}`);
  }

  const {itemVar, indexVar, listExpression} = parseForExpression(vForDir.exp.content);

  let keyExpression: string | undefined;
  for (const prop of node.props) {
    if (
      prop.type === NodeTypes.DIRECTIVE
      && prop.name === 'bind'
      && prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION
      && prop.arg.content === 'key'
      && prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION
    ) {
      keyExpression = prop.exp.content;
    }
  }

  // <template> acts as a fragment — children become the list body directly
  const isFragment = node.tag === 'template';
  const body: TuiRenderNode[] = [];

  if (isFragment) {
    let i = 0;
    const children = node.children as readonly TemplateChildNode[];
    while (i < children.length) {
      const child = children[i]!;
      if (child.type === NodeTypes.ELEMENT && findDirective(child, 'if')) {
        const {block, nextIndex} = processConditionalChain(child, children, i, ctx);
        body.push(block);
        i = nextIndex;
      } else if (child.type === NodeTypes.ELEMENT && findDirective(child, 'for')) {
        body.push(processListBlock(child, ctx));
        i++;
      } else {
        const transformed = transformNode(child, ctx);
        if (transformed) {
          body.push(transformed);
        }

        i++;
      }
    }
  } else {
    // Non-template element with v-for: the element itself is the repeated body
    const transformed = transformElement(node, ctx);
    body.push(transformed);
  }

  return {
    type: 'TuiListBlock',
    itemVar,
    indexVar,
    listExpression,
    keyExpression,
    body,
    loc: node.loc,
  };
}

function camelize(value: string): string {
  return value.replaceAll(/-([a-z])/gv, (_, c: string) => c.toUpperCase());
}
