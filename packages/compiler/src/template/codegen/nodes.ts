import {RUNTIME_HELPERS} from '../../runtime-helpers';
import type {TuiRenderNode, TuiWidgetCall, TuiDynamicComponent} from '../ast';
import {wrapExpr, wrapConditionExpr} from '../expression-wrapping';
import {buildEventHandler} from '../event-codegen';
import {
  getWidgetVarName,
  resolvePropHandler,
  emitPropEffect,
  buildSetterCall,
  buildComponentPropsInfo,
  buildComponentEmits,
  buildTrailingArgs,
  BOOLEAN_FLAGS,
  type NodeGenResult,
} from './props';
import {generateConditional} from './conditions';
import {generateList} from './list';

const {EFFECT} = RUNTIME_HELPERS;

export function generateNode(node: TuiRenderNode, index: number, parentVarName?: string): NodeGenResult | undefined {
  switch (node.type) {
    case 'TuiWidgetCall': {
      return generateWidgetCall(node, index, parentVarName);
    }

    case 'TuiConditionalBlock': {
      return generateConditional(node, index, parentVarName);
    }

    case 'TuiListBlock': {
      return generateList(node, index, parentVarName, generateNode);
    }

    case 'TuiDynamicComponent': {
      return generateDynamicComponent(node, index, parentVarName);
    }

    default: {
      assertNever(node);
    }
  }
}

function generateWidgetCall(node: TuiWidgetCall, index: number, parentVarName?: string): NodeGenResult {
  const showProp = node.dynamicProps.find(p => p.name === 'visible');

  // Component call with v-show: track mounted widgets via a proxy mount target
  if (showProp && (node.isComponent ?? false)) {
    const varName = getWidgetVarName(node, index);
    const mountCall = parentVarName ? `${parentVarName}.addChild(w)` : '__target.mount(w)';
    const unmountCall = parentVarName ? `${parentVarName}.removeChild(w)` : '__target.unmount(w)';
    const {preLines, propsArg} = buildComponentPropsInfo(node, varName);
    const emitsArg = buildComponentEmits(node.events);
    const trailing = buildTrailingArgs(propsArg, emitsArg);
    const lines = [
      ...preLines,
      `const ${varName}_w = [];`,
      `const ${varName} = __runSetup(__scene, () => ${node.creator}.setup(__scene, {`,
      `  mount(w) { ${mountCall}; ${varName}_w.push(w); },`,
      `  unmount(w) { ${unmountCall}; const i = ${varName}_w.indexOf(w); if (i >= 0) ${varName}_w.splice(i, 1); }`,
      `})${trailing});`,
      `effect(() => { const _v = ${wrapConditionExpr(showProp.expression)}; for (const w of ${varName}_w) { w.setVisible(_v); } });`,
    ];
    return {lines, nextIndex: index + 1};
  }

  // Component call: wrap in __runSetup for lifecycle scoping + props passing
  if (node.isComponent ?? false) {
    const varName = getWidgetVarName(node, index);
    const {preLines, propsArg} = buildComponentPropsInfo(node, varName);
    const emitsArg = buildComponentEmits(node.events);
    const trailing = buildTrailingArgs(propsArg, emitsArg);
    const nestedCall = parentVarName
      ? `__runSetup(__scene, () => ${node.creator}.setup(__scene, { mount(w) { ${parentVarName}.addChild(w); }, unmount(w) { ${parentVarName}.removeChild(w); } })${trailing});`
      : `__runSetup(__scene, () => ${node.creator}.setup(__scene)${trailing});`;
    return {lines: [...preLines, nestedCall], nextIndex: index + 1};
  }

  const varName = getWidgetVarName(node, index);
  const args: string[] = [];

  // Build options object from props — all props (static and dynamic) go to the constructor.
  // Boolean flag props (disabled, checked, etc.) need string→bool conversion for
  // static values, and are also used for reactive effect generation for dynamic values.
  const props: string[] = [];
  for (const prop of node.props) {
    const isFlag = BOOLEAN_FLAGS.has(prop.name);
    // Bare boolean attrs (readonly, disabled, etc.) arrive as string "true"/"false"
    if (isFlag) {
      props.push(`${prop.name}: ${prop.value === 'true'}`);
    } else {
      props.push(`${prop.name}: ${JSON.stringify(prop.value)}`);
    }
  }

  for (const prop of node.dynamicProps) {
    props.push(`${prop.name}: ${wrapExpr(prop.expression)}`);
  }

  if (props.length > 0) {
    args.push(`{ ${props.join(', ')} }`);
  }

  const lines: string[] = [
    `const ${varName} = ${node.creator}(${args.join(', ')});`,
  ];

  // Apply static props through their setters too. All props are passed to the
  // constructor above, but only some widgets read every prop from options (e.g.
  // only Box reads `position`/`draggable`), so a static `position="absolute"` on
  // a Text would otherwise be dropped and the widget would stay `static`. The
  // `updateRect` handler is excluded because size/percent coercion is owned by the
  // constructor's initRect path.
  for (const prop of node.props) {
    const handler = node.propHandlers?.[prop.name];
    if (!handler || handler.method === 'updateRect') {
      continue;
    }

    const isFlag = BOOLEAN_FLAGS.has(prop.name);
    const valueExpr = isFlag ? String(prop.value === 'true') : JSON.stringify(prop.value);
    lines.push(`${buildSetterCall(varName, handler, valueExpr)};`);
  }

  // Generate reactive effect bindings
  for (const prop of node.dynamicProps) {
    const handler = resolvePropHandler(node, prop.name, prop.loc);
    if (handler) {
      lines.push(emitPropEffect(varName, handler, prop.expression));
    }
  }

  // Generate event handler registrations
  for (const eventBinding of node.events) {
    lines.push(`${varName}.on('${eventBinding.event}', ${buildEventHandler(eventBinding)});`);
  }

  if (node.refName) {
    lines.push(`${node.refName}.value = ${varName};`);
  }

  // Generate children and add them to the parent widget
  let nextIndex = index + 1;
  for (const child of node.children) {
    if (child.type === 'TuiWidgetCall' && (child.isComponent ?? false)) {
      const result = generateNode(child, nextIndex, varName);
      if (result) {
        lines.push(...result.lines);
        nextIndex = result.nextIndex;
      }
    } else if (child.type === 'TuiWidgetCall') {
      const childVarName = getWidgetVarName(child, nextIndex);
      const result = generateNode(child, nextIndex);
      if (result) {
        lines.push(...result.lines, `${varName}.addChild(${childVarName});`);
        nextIndex = result.nextIndex;
      }
    } else if (child.type === 'TuiListBlock') {
      const result = generateList(child, nextIndex, varName, generateNode);
      lines.push(...result.lines);
      nextIndex = result.nextIndex;
    } else {
      const result = generateNode(child, nextIndex, varName);
      if (result) {
        lines.push(...result.lines);
        nextIndex = result.nextIndex;
      }
    }
  }

  return {lines, nextIndex};
}

function generateDynamicComponent(
  node: TuiDynamicComponent,
  index: number,
  parentVarName?: string,
): NodeGenResult {
  const varName = `__component${index}`;
  const {preLines, propsArg} = buildComponentPropsInfo(node, varName);
  const emitsArg = buildComponentEmits(node.events);
  const trailing = buildTrailingArgs(propsArg, emitsArg);
  const lines = [
    ...preLines,
    `let ${varName}_cleanup;`,
    `let ${varName}_prev;`,
    `${EFFECT}(() => {`,
    `  const __c = ${wrapExpr(node.isExpression)};`,
    `  if (__c === ${varName}_prev) {`,
    '    return;',
    '  }',
    `  ${varName}_cleanup?.();`,
    `  ${varName}_prev = __c;`,
    '  if (!__c) {',
    `    ${varName}_cleanup = undefined;`,
    '    return;',
    '  }',
    parentVarName
      ? `  ${varName}_cleanup = __runSetup(__scene, () => __c.setup(__scene, { mount(w) { ${parentVarName}.addChild(w); }, unmount(w) { ${parentVarName}.removeChild(w); } })${trailing});`
      : `  ${varName}_cleanup = __runSetup(__scene, () => __c.setup(__scene)${trailing});`,
    '});',
  ];

  return {lines, nextIndex: index + 1};
}
