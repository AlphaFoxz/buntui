import {RUNTIME_HELPERS} from '../../runtime-helpers';
import type {TuiListBlock, TuiWidgetCall} from '../ast';
import {wrapExpr} from '../expression-wrapping';
import {buildEventHandler} from '../event-codegen';
import {
  resolvePropHandler,
  getWidgetVarName,
  buildWidgetCreation,
  type NodeGenResult,
  type EmitNode,
} from './props';
import {generateConditional} from './conditions';

const {EFFECT} = RUNTIME_HELPERS;

/**
 Generate a list block. Keyed lists (`:key` present) use the diffing
 implementation; static lists are the degenerate case emitting a plain loop.
 */
export function generateList(node: TuiListBlock, index: number, parentVar: string | undefined, emitNode: EmitNode): NodeGenResult {
  return node.keyExpression ? generateKeyedList(node, index, parentVar, emitNode) : generateStaticList(node, index, parentVar, emitNode);
}

/**
 Shared loop-header emission for static and keyed lists: numeric range
 (1..N inclusive), array with index (entries()), or plain array iteration.
 */
function buildLoopHeader(node: TuiListBlock): string[] {
  const isRange = /^\d+$/v.test(node.listExpression.trim());
  if (isRange) {
    if (node.indexVar) {
      // V-for="(item, index) in N" → index = 0..N-1, item = 1..N
      return [
        `for (let ${node.indexVar} = 0; ${node.indexVar} < ${node.listExpression}; ${node.indexVar}++) {`,
        `  const ${node.itemVar} = ${node.indexVar} + 1;`,
      ];
    }

    return [`for (let ${node.itemVar} = 1; ${node.itemVar} <= ${node.listExpression}; ${node.itemVar}++) {`];
  }

  if (node.indexVar) {
    // Array with index: entries() yields [index, value]
    return [`for (const [${node.indexVar}, ${node.itemVar}] of ${wrapExpr(node.listExpression)}.entries()) {`];
  }

  // Array without index
  return [`for (const ${node.itemVar} of ${wrapExpr(node.listExpression)}) {`];
}

function generateStaticList(node: TuiListBlock, index: number, parentVar: string | undefined, emitNode: EmitNode): NodeGenResult {
  const lines: string[] = [...buildLoopHeader(node)];

  let nextIndex = index;
  for (const child of node.body) {
    if (parentVar && child.type === 'TuiWidgetCall' && child.isComponent !== true) {
      const childVarName = getWidgetVarName(child, nextIndex);
      const result = emitNode(child, nextIndex);
      if (result) {
        for (const l of result.lines) {
          lines.push(`  ${l}`);
        }

        lines.push(`  ${parentVar}.addChild(${childVarName});`);
        nextIndex = result.nextIndex;
      }
    } else {
      const result = emitNode(child, nextIndex, parentVar);
      if (result) {
        for (const l of result.lines) {
          lines.push(`  ${l}`);
        }

        nextIndex = result.nextIndex;
      }
    }
  }

  lines.push('}');

  return {lines, nextIndex};
}

function generateKeyedList(node: TuiListBlock, index: number, parentVar: string | undefined, emitNode: EmitNode): NodeGenResult {
  const lines: string[] = [];
  const mapVar = `__list${index}_map`;
  const keyExpr = wrapExpr(node.keyExpression!);

  lines.push(
    `let ${mapVar} = new Map();`,
    `${EFFECT}(() => {`,
    `  for (const [, __w] of ${mapVar}) {`,
    parentVar ? `    ${parentVar}.removeChild(__w);` : '    __target.unmount(__w);',
    '  }',
    '  const __new = new Map();',
  );

  for (const headerLine of buildLoopHeader(node)) {
    lines.push(`  ${headerLine}`);
  }

  let nextIndex = index;
  for (const child of node.body) {
    if (child.type === 'TuiWidgetCall' && child.isComponent !== true) {
      nextIndex = generateKeyedBodyWidget(child, nextIndex, mapVar, keyExpr, parentVar, lines);
    } else if (child.type === 'TuiWidgetCall' && (child.isComponent ?? false)) {
      const result = emitNode(child, nextIndex, parentVar);
      if (result) {
        for (const l of result.lines) {
          lines.push(`    ${l}`);
        }

        nextIndex = result.nextIndex;
      }
    } else if (child.type === 'TuiConditionalBlock') {
      const result = generateConditional(child, nextIndex, parentVar);
      for (const line of result.lines) {
        lines.push(`    ${line}`);
      }

      nextIndex = result.nextIndex;
    } else if (child.type === 'TuiListBlock') {
      const result = generateList(child, nextIndex, parentVar, emitNode);
      for (const line of result.lines) {
        lines.push(`    ${line}`);
      }

      nextIndex = result.nextIndex;
    }
  }

  lines.push('  }', `  ${mapVar} = __new;`, '});');

  return {lines, nextIndex};
}

function generateKeyedBodyWidget(
  node: TuiWidgetCall,
  index: number,
  mapVar: string,
  keyExpr: string,
  parentVar: string | undefined,
  lines: string[],
): number {
  const varName = getWidgetVarName(node, index);

  lines.push(`    let ${varName} = ${mapVar}.get(${keyExpr});`, `    if (${varName}) {`);

  for (const prop of node.dynamicProps) {
    const handler = resolvePropHandler(node, prop.name, prop.loc);
    if (!handler) {
      continue;
    }

    const expr = wrapExpr(prop.expression);
    const call = handler.field
      ? `${varName}.${handler.method}({${handler.field}: ${expr}})`
      : `${varName}.${handler.method}(${expr})`;
    lines.push(`      ${call};`);
  }

  lines.push('    } else {', `      ${varName} = ${buildWidgetCreation(node)};`);

  for (const eventBinding of node.events) {
    lines.push(`      ${varName}.on('${eventBinding.event}', ${buildEventHandler(eventBinding)});`);
  }

  let nextIndex = index + 1;
  for (const subChild of node.children) {
    if (subChild.type !== 'TuiWidgetCall' || subChild.isComponent === true) {
      continue;
    }

    const subVar = getWidgetVarName(subChild, nextIndex);
    lines.push(`      const ${subVar} = ${buildWidgetCreation(subChild)};`);
    for (const eventBinding of subChild.events) {
      lines.push(`      ${subVar}.on('${eventBinding.event}', ${buildEventHandler(eventBinding)});`);
    }

    lines.push(`      ${varName}.addChild(${subVar});`);
    nextIndex++;
  }

  lines.push(
    '    }',
    parentVar ? `    ${parentVar}.addChild(${varName});` : `    __target.mount(${varName});`,
    `    __new.set(${keyExpr}, ${varName});`,
  );

  return nextIndex;
}
