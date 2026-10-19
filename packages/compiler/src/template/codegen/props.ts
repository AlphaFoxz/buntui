import type {SourceLocation} from '@vue/compiler-core';
import {RUNTIME_HELPERS, type PropHandler} from '../../runtime-helpers';
import type {
  TuiWidgetCall,
  TuiStaticProp,
  TuiDynamicProp,
  TuiEventBinding,
  TuiRenderNode,
} from '../ast';
import {wrapExpr} from '../expression-wrapping';
import {buildEventHandler} from '../event-codegen';

const {EFFECT, REACTIVE} = RUNTIME_HELPERS;

export const BOOLEAN_FLAGS = new Set(['disabled', 'checked', 'readonly', 'draggable']);

export type NodeGenResult = {
  lines: string[];
  nextIndex: number;
};

export type EmitNode = (node: TuiRenderNode, index: number, parentVarName?: string) => NodeGenResult | undefined;

export function getWidgetVarName(node: TuiWidgetCall, index: number): string {
  return `__${node.tag.toLowerCase()}${index}`;
}

export function isWidgetCall(node: TuiRenderNode): node is TuiWidgetCall {
  return node.type === 'TuiWidgetCall';
}

export function resolvePropHandler(node: TuiWidgetCall, propName: string, propLoc?: SourceLocation): PropHandler | undefined {
  if (!node.propHandlers) {
    return undefined;
  }

  const handler = node.propHandlers[propName];
  if (handler) {
    return handler;
  }

  // eslint-disable-next-line @stylistic/max-len
  throw new Error(`Unknown prop "${propName}" on <${node.tag}> at line ${propLoc?.start.line ?? node.loc.start.line}:${propLoc?.start.column ?? node.loc.start.column}. This widget only accepts: ${Object.keys(node.propHandlers).join(', ')}.`);
}

export function buildSetterCall(varName: string, handler: PropHandler, valueExpr: string): string {
  return handler.field
    ? `${varName}.${handler.method}({${handler.field}: ${valueExpr}})`
    : `${varName}.${handler.method}(${valueExpr})`;
}

export function emitPropEffect(varName: string, handler: PropHandler, expression: string, guard?: string): string {
  const call = buildSetterCall(varName, handler, wrapExpr(expression));
  return guard ? `${EFFECT}(() => { ${guard} { ${call}; } });` : `${EFFECT}(() => { ${call}; });`;
}

export function buildWidgetCreation(node: TuiWidgetCall, parentVarName?: string, propsArg?: string, emitsArg?: string): string {
  if (node.isComponent ?? false) {
    const trailing = buildTrailingArgs(propsArg, emitsArg);
    return parentVarName
      ? `__runSetup(__scene, () => ${node.creator}.setup(__scene, { mount(w) { ${parentVarName}.addChild(w); }, unmount(w) { ${parentVarName}.removeChild(w); } })${trailing})`
      : `__runSetup(__scene, () => ${node.creator}.setup(__scene)${trailing})`;
  }

  const props: string[] = [];
  for (const prop of node.props) {
    const isFlag = BOOLEAN_FLAGS.has(prop.name);
    if (isFlag) {
      props.push(`${prop.name}: ${prop.value === 'true'}`);
    } else {
      props.push(`${prop.name}: ${JSON.stringify(prop.value)}`);
    }
  }

  for (const prop of node.dynamicProps) {
    props.push(`${prop.name}: ${wrapExpr(prop.expression)}`);
  }

  return props.length > 0
    ? `${node.creator}({ ${props.join(', ')} })`
    : `${node.creator}()`;
}

export type ComponentPropsInfo = {
  preLines: string[];
  propsArg: string | undefined;
};

export type ComponentPropsSource = {
  props: readonly TuiStaticProp[];
  dynamicProps: readonly TuiDynamicProp[];
};

export function buildComponentPropsInfo(node: ComponentPropsSource, varName: string): ComponentPropsInfo {
  const staticProps: string[] = [];
  const dynamicPropList: Array<{name: string; expr: string}> = [];

  for (const prop of node.props) {
    staticProps.push(`${prop.name}: ${JSON.stringify(prop.value)}`);
  }

  for (const prop of node.dynamicProps) {
    if (prop.name === 'visible') {
      continue;
    }

    dynamicPropList.push({name: prop.name, expr: wrapExpr(prop.expression)});
  }

  if (staticProps.length === 0 && dynamicPropList.length === 0) {
    return {preLines: [], propsArg: undefined};
  }

  if (dynamicPropList.length === 0) {
    return {
      preLines: [],
      propsArg: `{ ${staticProps.join(', ')} }`,
    };
  }

  const propsVar = `${varName}_props`;
  const initialObject = staticProps.length > 0 ? `{ ${staticProps.join(', ')} }` : '{}';
  const preLines = [
    `const ${propsVar} = ${REACTIVE}(${initialObject});`,
    ...dynamicPropList.map(({name, expr}) =>
      `${EFFECT}(() => { ${propsVar}.${name} = ${expr}; });`),
  ];

  return {preLines, propsArg: propsVar};
}

export function buildComponentEmits(events: readonly TuiEventBinding[]): string | undefined {
  if (events.length === 0) {
    return undefined;
  }

  const entries = events.map(eb => `'${eb.event}': ${buildEventHandler(eb)}`);
  return `{ ${entries.join(', ')} }`;
}

export function buildTrailingArgs(propsArg?: string, emitsArg?: string): string {
  if (!propsArg && !emitsArg) {
    return '';
  }

  if (!emitsArg) {
    return `, ${propsArg}`;
  }

  return propsArg ? `, ${propsArg}, ${emitsArg}` : `, undefined, ${emitsArg}`;
}
