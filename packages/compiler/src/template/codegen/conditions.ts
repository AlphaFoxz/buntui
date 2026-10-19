import {RUNTIME_HELPERS} from '../../runtime-helpers';
import type {TuiWidgetCall, TuiConditionalBlock} from '../ast';
import {wrapConditionExpr} from '../expression-wrapping';
import {buildEventHandler} from '../event-codegen';
import {
  getWidgetVarName,
  isWidgetCall,
  resolvePropHandler,
  emitPropEffect,
  buildWidgetCreation,
  buildComponentPropsInfo,
  buildComponentEmits,
  type NodeGenResult,
} from './props';

const {EFFECT} = RUNTIME_HELPERS;

export type FlattenedBranch = {
  condition: string | null;
  nodes: TuiWidgetCall[];
};

export function flattenConditional(block: TuiConditionalBlock): FlattenedBranch[] {
  const branches: FlattenedBranch[] = [
    {condition: block.condition, nodes: block.consequent.filter((n): n is TuiWidgetCall => isWidgetCall(n))},
  ];

  let current = block.alternate;
  while (current) {
    if (Array.isArray(current)) {
      branches.push({condition: null, nodes: current.filter((n): n is TuiWidgetCall => isWidgetCall(n))});
      break;
    }

    branches.push({condition: current.condition, nodes: current.consequent.filter((n): n is TuiWidgetCall => isWidgetCall(n))});
    current = current.alternate;
  }

  return branches;
}

export type WidgetInfo = {
  varName: string;
  createLine: string;
  preLines: string[];
  updateEffects: string[];
  eventLines: string[];
  isComponent: boolean;
};

export type WidgetTree = {
  root: WidgetInfo;
  descendants: WidgetInfo[];
  childMountLines: string[];
};

export function collectWidgetTree(
  node: TuiWidgetCall,
  startIndex: number,
  parentVarName?: string,
): {tree: WidgetTree; nextIndex: number} {
  const varName = getWidgetVarName(node, startIndex);
  const childMountLines: string[] = [];
  const descendants: WidgetInfo[] = [];
  let nextIndex = startIndex + 1;

  const isComponentNode = node.isComponent ?? false;
  const childParent = isComponentNode ? parentVarName : varName;
  const propsInfo = isComponentNode
    ? buildComponentPropsInfo(node, varName)
    : {preLines: [] as string[], propsArg: undefined as string | undefined};
  const emitsArg = isComponentNode ? buildComponentEmits(node.events) : undefined;

  for (const child of node.children) {
    if (child.type !== 'TuiWidgetCall') {
      continue;
    }

    const childResult = collectWidgetTree(child, nextIndex, childParent);
    if (!isComponentNode && !(child.isComponent ?? false)) {
      childMountLines.push(`${varName}.addChild(${childResult.tree.root.varName});`, ...childResult.tree.childMountLines);
    }

    descendants.push(childResult.tree.root, ...childResult.tree.descendants);
    nextIndex = childResult.nextIndex;
  }

  return {
    tree: {
      root: {
        varName,
        createLine: buildWidgetCreation(node, isComponentNode ? parentVarName : undefined, propsInfo.propsArg, emitsArg),
        preLines: propsInfo.preLines,
        updateEffects: buildGuardedUpdateEffects(node, varName),
        eventLines: buildEventLines(node, varName),
        isComponent: isComponentNode,
      },
      descendants,
      childMountLines,
    },
    nextIndex,
  };
}

export function buildUnmountTreeLines(tree: WidgetTree, parentVarName?: string): string[] {
  const lines: string[] = [];
  if (tree.root.isComponent) {
    lines.push(
      `    if (${tree.root.varName}) {`,
      `      ${tree.root.varName}();`,
      `      ${tree.root.varName} = null;`,
    );
  } else if (parentVarName) {
    lines.push(
      `    if (${tree.root.varName}) {`,
      `      ${parentVarName}.removeChild(${tree.root.varName});`,
      `      ${tree.root.varName} = null;`,
    );
  } else {
    lines.push(
      `    if (${tree.root.varName}) {`,
      `      __target.unmount(${tree.root.varName});`,
      `      ${tree.root.varName} = null;`,
    );
  }

  for (const d of tree.descendants) {
    if (d.isComponent) {
      lines.push(`      ${d.varName}();`);
    }

    lines.push(`      ${d.varName} = null;`);
  }

  lines.push('    }');
  return lines;
}

export function buildMountTreeLines(tree: WidgetTree, parentVarName?: string): string[] {
  const lines: string[] = [`    if (!${tree.root.varName}) {`, `      ${tree.root.varName} = ${tree.root.createLine};`];

  for (const d of tree.descendants) {
    lines.push(`      ${d.varName} = ${d.createLine};`);
  }

  for (const childMountLine of tree.childMountLines) {
    lines.push(`      ${childMountLine}`);
  }

  for (const eventLine of tree.root.eventLines) {
    lines.push(`      ${eventLine}`);
  }

  for (const d of tree.descendants) {
    for (const eventLine of d.eventLines) {
      lines.push(`      ${eventLine}`);
    }
  }

  if (tree.root.isComponent) {
    lines.push('    }');
  } else if (parentVarName) {
    lines.push(`      ${parentVarName}.addChild(${tree.root.varName});`, '    }');
  } else {
    lines.push(`      __target.mount(${tree.root.varName});`, '    }');
  }

  return lines;
}

export function generateConditional(block: TuiConditionalBlock, index: number, parentVarName?: string): NodeGenResult {
  const branches = flattenConditional(block);
  const lines: string[] = [];
  let nextIndex = index;

  // Collect widget trees per branch (including children)
  const branchTrees: WidgetTree[][] = [];
  for (const branch of branches) {
    const trees: WidgetTree[] = [];
    for (const node of branch.nodes) {
      const result = collectWidgetTree(node, nextIndex, parentVarName);
      trees.push(result.tree);
      nextIndex = result.nextIndex;
    }

    branchTrees.push(trees);
  }

  // Emit preLines (reactive props objects + effects) for all branches before the toggle effect
  for (const trees of branchTrees) {
    for (const tree of trees) {
      lines.push(...tree.root.preLines);
      for (const d of tree.descendants) {
        lines.push(...d.preLines);
      }
    }
  }

  // Declare all vars as null (root + descendants)
  for (const trees of branchTrees) {
    for (const tree of trees) {
      lines.push(`let ${tree.root.varName} = null;`);
      for (const d of tree.descendants) {
        lines.push(`let ${d.varName} = null;`);
      }
    }
  }

  // Generate the toggle effect: if/else-if/else chain
  const effectLines: string[] = [];

  for (let i = 0; i < branches.length; i++) {
    const {condition} = branches[i]!;
    const keyword = i === 0 ? 'if' : (condition ? 'else if' : 'else');
    const condPart = condition ? ` (${wrapConditionExpr(condition)})` : '';

    effectLines.push(`${keyword}${condPart} {`);

    // Mount this branch's widgets (root + descendants)
    for (const tree of branchTrees[i]!) {
      effectLines.push(...buildMountTreeLines(tree, parentVarName));
    }

    // Unmount other branches' widgets
    for (let j = 0; j < branches.length; j++) {
      if (j === i) {
        continue;
      }

      for (const tree of branchTrees[j]!) {
        effectLines.push(...buildUnmountTreeLines(tree, parentVarName));
      }
    }

    effectLines.push('}');
  }

  // If last branch has a condition (no v-else), add final else to unmount all
  const lastBranch = branches.at(-1)!;
  if (lastBranch.condition !== null) {
    effectLines.push(' else {');
    for (const trees of branchTrees) {
      for (const tree of trees) {
        effectLines.push(...buildUnmountTreeLines(tree, parentVarName));
      }
    }

    effectLines.push('}');
  }

  lines.push(`${EFFECT}(() => {`);
  for (const l of effectLines) {
    lines.push(`  ${l}`);
  }

  lines.push('});');

  // Guarded update effects for all widgets (root + descendants)
  for (const trees of branchTrees) {
    for (const tree of trees) {
      lines.push(...tree.root.updateEffects);
      for (const d of tree.descendants) {
        lines.push(...d.updateEffects);
      }
    }
  }

  return {lines, nextIndex};
}

export function buildGuardedUpdateEffects(node: TuiWidgetCall, varName: string): string[] {
  if (node.isComponent ?? false) {
    return [];
  }

  const effects: string[] = [];
  for (const prop of node.dynamicProps) {
    const handler = resolvePropHandler(node, prop.name, prop.loc);
    if (handler) {
      effects.push(emitPropEffect(varName, handler, prop.expression, `if (${varName})`));
    }
  }

  return effects;
}

export function buildEventLines(node: TuiWidgetCall, varName: string): string[] {
  if (node.isComponent ?? false) {
    return [];
  }

  const result: string[] = Array.from(node.events, eventBinding => `${varName}.on('${eventBinding.event}', ${buildEventHandler(eventBinding)});`);

  return result;
}
