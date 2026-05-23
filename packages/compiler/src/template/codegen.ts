import {RUNTIME_HELPERS} from '../runtime-helpers';
import type {
  TuiRenderRoot,
  TuiWidgetCall,
  TuiRenderNode,
  TuiConditionalBlock,
  TuiListBlock,
} from './ast';
import {wrapExpr, wrapConditionExpr} from './expression-wrapping';
import {buildEventHandler} from './event-codegen';
import {PROP_UPDATE_MAP, FLAG_PROP_MAP, BOOLEAN_FLAGS} from './widget-props';

const {EFFECT, UNREF} = RUNTIME_HELPERS;

export type CodegenOptions = {
  /** Module ID for the core package import */
  coreModuleId?: string;
  /** Module ID for @vue/reactivity import */
  reactivityModuleId?: string;
  /** Script body lines to embed inside setup() */
  scriptBody?: string[];
};

export type CodegenResult = {
  /** Full generated code (imports + body, for backward compat) */
  code: string;
  /** Body lines only (no import statements) */
  body: string;
  /** Runtime imports needed by the generated code */
  imports: string[];
};

/**
 * Generate TypeScript source code from a TUI render tree.
 * Produces an exportable `setup(scene)` function that creates widgets
 * and mounts them to the scene.
 */
export function generate(root: TuiRenderRoot, options?: CodegenOptions): CodegenResult {
  const core = options?.coreModuleId ?? '@buntui/core';
  const react = options?.reactivityModuleId ?? '@vue/reactivity';
  const imports: string[] = [];
  const lines: string[] = [];

  // Collect imports from used creators, grouped by module
  if (root.usedCreators.size > 0) {
    const moduleGroups = new Map<string, string[]>();
    for (const creator of root.usedCreators) {
      const registeredMod = root.usedModules.get(creator);
      const mod = registeredMod === '@buntui/core' && core !== '@buntui/core'
        ? core
        : (registeredMod ?? core);
      const group = moduleGroups.get(mod) ?? [];
      group.push(creator);
      moduleGroups.set(mod, group);
    }

    for (const [mod, creators] of moduleGroups) {
      imports.push(`import { ${creators.join(', ')} } from '${mod}';`);
    }
  }

  // Import reactivity helpers if we have dynamic bindings
  if (root.effects.length > 0 || hasDynamicBindings(root)) {
    imports.push(`import {${EFFECT}, ${UNREF}} from '${react}';`);
  }

  // Import runSetup for component lifecycle scoping
  if (hasComponentCalls(root)) {
    imports.push(`import { runSetup as __runSetup } from '${core}';`);
  }

  // Generate setup function
  lines.push('', 'export function setup(__scene) {');

  // Embed script body inside setup() so side effects (setInterval, etc.)
  // are scoped to the setup call, not module-level
  if (options?.scriptBody && options.scriptBody.length > 0) {
    for (const line of options.scriptBody) {
      lines.push(`  ${line}`);
    }
  }

  // Widget declarations — split into declarative (non-component) and deferred
  // (conditional/component) so that non-component widgets are created and
  // mounted BEFORE any v-if/v-show effects run. This ensures correct z-order:
  // later template nodes render on top of earlier ones.
  let widgetIndex = 0;
  const childStartIndices: number[] = [];
  const declarativeLines: string[] = [];
  const deferredLines: string[] = [];
  for (const child of root.children) {
    childStartIndices.push(widgetIndex);
    const generated = generateNode(child, widgetIndex);
    if (generated) {
      const isDeclarative = child.type === 'TuiWidgetCall' && !child.isComponent;
      (isDeclarative ? declarativeLines : deferredLines).push(...generated.lines.map(l => `  ${l}`));
      widgetIndex = generated.nextIndex;
    }
  }

  // Emit non-component widget declarations first
  lines.push(...declarativeLines);

  // Mount all top-level non-component widgets (before conditional/component effects run)
  const mountedWidgetVars: string[] = [];
  for (let childIndex = 0; childIndex < root.children.length; childIndex++) {
    const child = root.children[childIndex]!;
    if (child.type === 'TuiWidgetCall' && !child.isComponent) {
      const varName = getWidgetVarName(child, childStartIndices[childIndex]!);
      lines.push(`  __scene.mount(${varName});`);
      mountedWidgetVars.push(varName);
    }
  }

  // Emit conditional blocks and component setups after non-component widgets are mounted
  lines.push(...deferredLines);

  // Return cleanup function so parent v-if can unmount this component's widgets
  const cleanupLines = mountedWidgetVars.map(v => `    __scene.unmount(${v});`);
  lines.push('  return () => {', ...cleanupLines, '  };', '}', '', 'export default { setup };');

  const body = lines.join('\n');
  const code = [...imports, body].join('\n');
  return {code, body, imports};
}

type NodeGenResult = {
  lines: string[];
  nextIndex: number;
};

function generateNode(node: TuiRenderNode, index: number): NodeGenResult | undefined {
  switch (node.type) {
    case 'TuiWidgetCall': {
      return generateWidgetCall(node, index);
    }

    case 'TuiConditionalBlock': {
      return generateConditional(node, index);
    }

    case 'TuiListBlock': {
      return generateList(node, index);
    }

    // Default: {
    //   return undefined;
    // }
  }
}

function generateWidgetCall(node: TuiWidgetCall, index: number): NodeGenResult {
  const showProp = node.dynamicProps.find(p => p.name === 'visible');

  // Component call with v-show: track mounted widgets via a proxy scene
  if (node.isComponent && showProp) {
    const varName = getWidgetVarName(node, index);
    const lines = [
      `const ${varName}_w = [];`,
      `const ${varName} = ${node.creator}.setup({`,
      `  mount(w) { __scene.mount(w); ${varName}_w.push(w); },`,
      `  unmount(w) { __scene.unmount(w); const i = ${varName}_w.indexOf(w); if (i >= 0) ${varName}_w.splice(i, 1); }`,
      '});',
      `effect(() => { const _v = ${wrapConditionExpr(showProp.expression)}; for (const w of ${varName}_w) { w.setVisible(_v); } });`,
    ];
    return {lines, nextIndex: index + 1};
  }

  // Component call: ImportName.setup(scene)
  if (node.isComponent) {
    return {
      lines: [`${node.creator}.setup(__scene);`],
      nextIndex: index + 1,
    };
  }

  const varName = getWidgetVarName(node, index);
  const args: string[] = [];

  // Build options object from props — all props (static and dynamic) go to the constructor.
  // FLAG_PROP_MAP entries indicate boolean/flag props that need string→bool conversion for
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

  // Generate reactive effect bindings
  for (const prop of node.dynamicProps) {
    const info = PROP_UPDATE_MAP[prop.name];
    if (info) {
      if (info.field) {
        // Grouped prop: widget.updateRect({x: expr})
        lines.push(`${EFFECT}(() => { ${varName}.${info.method}({${info.field}: ${wrapExpr(prop.expression)}}); });`);
      } else {
        // Primitive prop: widget.updateText(expr)
        lines.push(`${EFFECT}(() => { ${varName}.${info.method}(${wrapExpr(prop.expression)}); });`);
      }

      continue;
    }

    // Flag props (disabled, checked, etc.): reactive setter calls
    const setter = FLAG_PROP_MAP[prop.name];
    if (setter) {
      const expr = wrapExpr(prop.expression);
      lines.push(`${EFFECT}(() => { ${varName}.${setter}(${expr}); });`);
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
    if (child.type === 'TuiWidgetCall' && child.isComponent) {
      // Component children mount directly to scene, no addChild
      const result = generateNode(child, nextIndex);
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
      const result = generateList(child, nextIndex, varName);
      if (result) {
        lines.push(...result.lines);
        nextIndex = result.nextIndex;
      }
    } else {
      const result = generateNode(child, nextIndex);
      if (result) {
        lines.push(...result.lines);
        nextIndex = result.nextIndex;
      }
    }
  }

  return {lines, nextIndex};
}

type FlattenedBranch = {
  condition: string | null;
  nodes: TuiWidgetCall[];
};

function isWidgetCall(node: TuiRenderNode): node is TuiWidgetCall {
  return node.type === 'TuiWidgetCall';
}

function flattenConditional(block: TuiConditionalBlock): FlattenedBranch[] {
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

type WidgetInfo = {
  varName: string;
  createLine: string;
  updateEffects: string[];
  eventLines: string[];
  isComponent: boolean;
};

type WidgetTree = {
  root: WidgetInfo;
  descendants: WidgetInfo[];
  addChildLines: string[];
};

function collectWidgetTree(
  node: TuiWidgetCall,
  startIndex: number,
): {tree: WidgetTree; nextIndex: number} {
  const varName = getWidgetVarName(node, startIndex);
  const addChildLines: string[] = [];
  const descendants: WidgetInfo[] = [];
  let nextIndex = startIndex + 1;

  for (const child of node.children) {
    if (child.type === 'TuiWidgetCall') {
      const childResult = collectWidgetTree(child, nextIndex);
      addChildLines.push(`${varName}.addChild(${childResult.tree.root.varName});`, ...childResult.tree.addChildLines);
      descendants.push(childResult.tree.root, ...childResult.tree.descendants);
      nextIndex = childResult.nextIndex;
    }
  }

  return {
    tree: {
      root: {
        varName,
        createLine: buildWidgetCreation(node),
        updateEffects: buildGuardedUpdateEffects(node, varName),
        eventLines: buildEventLines(node, varName),
        isComponent: node.isComponent ?? false,
      },
      descendants,
      addChildLines,
    },
    nextIndex,
  };
}

function buildUnmountTreeLines(tree: WidgetTree): string[] {
  const lines: string[] = [];
  if (tree.root.isComponent) {
    lines.push(
      `    if (${tree.root.varName}) {`,
      `      ${tree.root.varName}();`,
      `      ${tree.root.varName} = null;`,
    );
  } else {
    lines.push(
      `    if (${tree.root.varName}) {`,
      `      __scene.unmount(${tree.root.varName});`,
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

function buildMountTreeLines(tree: WidgetTree): string[] {
  const lines: string[] = [`    if (!${tree.root.varName}) {`, `      ${tree.root.varName} = ${tree.root.createLine};`];

  for (const d of tree.descendants) {
    lines.push(`      ${d.varName} = ${d.createLine};`);
  }

  for (const addLine of tree.addChildLines) {
    lines.push(`      ${addLine}`);
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
  } else {
    lines.push(`      __scene.mount(${tree.root.varName});`, '    }');
  }

  return lines;
}

function generateConditional(block: TuiConditionalBlock, index: number): NodeGenResult {
  const branches = flattenConditional(block);
  const lines: string[] = [];
  let nextIndex = index;

  // Collect widget trees per branch (including children)
  const branchTrees: WidgetTree[][] = [];
  for (const branch of branches) {
    const trees: WidgetTree[] = [];
    for (const node of branch.nodes) {
      const result = collectWidgetTree(node, nextIndex);
      trees.push(result.tree);
      nextIndex = result.nextIndex;
    }

    branchTrees.push(trees);
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
      effectLines.push(...buildMountTreeLines(tree));
    }

    // Unmount other branches' widgets
    for (let j = 0; j < branches.length; j++) {
      if (j === i) {
        continue;
      }

      for (const tree of branchTrees[j]!) {
        effectLines.push(...buildUnmountTreeLines(tree));
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
        effectLines.push(...buildUnmountTreeLines(tree));
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

function buildWidgetCreation(node: TuiWidgetCall): string {
  if (node.isComponent) {
    return `__runSetup(__scene, () => ${node.creator}.setup(__scene))`;
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

function buildGuardedUpdateEffects(node: TuiWidgetCall, varName: string): string[] {
  if (node.isComponent) {
    return [];
  }

  const effects: string[] = [];
  for (const prop of node.dynamicProps) {
    const info = PROP_UPDATE_MAP[prop.name];
    if (info) {
      if (info.field) {
        effects.push(`${EFFECT}(() => { if (${varName}) { ${varName}.${info.method}({${info.field}: ${wrapExpr(prop.expression)}}); } });`);
      } else {
        effects.push(`${EFFECT}(() => { if (${varName}) { ${varName}.${info.method}(${wrapExpr(prop.expression)}); } });`);
      }

      continue;
    }

    const setter = FLAG_PROP_MAP[prop.name];
    if (setter) {
      const expr = wrapExpr(prop.expression);
      effects.push(`${EFFECT}(() => { if (${varName}) { ${varName}.${setter}(${expr}); } });`);
    }
  }

  return effects;
}

function buildEventLines(node: TuiWidgetCall, varName: string): string[] {
  if (node.isComponent) {
    return [];
  }

  const result: string[] = [];
  for (const eventBinding of node.events) {
    result.push(`${varName}.on('${eventBinding.event}', ${buildEventHandler(eventBinding)});`);
  }

  return result;
}

function generateList(node: TuiListBlock, index: number, parentVar?: string): NodeGenResult {
  const lines: string[] = [];

  // Numeric range: v-for="i in 20" → Vue iterates 1..N inclusive
  const isRange = /^\d+$/v.test(node.listExpression.trim());
  if (isRange) {
    if (node.indexVar) {
      // V-for="(item, index) in N" → index = 0..N-1, item = 1..N
      lines.push(
        `for (let ${node.indexVar} = 0; ${node.indexVar} < ${node.listExpression}; ${node.indexVar}++) {`,
        `  const ${node.itemVar} = ${node.indexVar} + 1;`,
      );
    } else {
      lines.push(`for (let ${node.itemVar} = 1; ${node.itemVar} <= ${node.listExpression}; ${node.itemVar}++) {`);
    }
  } else if (node.indexVar) {
    // Array with index: entries() yields [index, value]
    lines.push(`for (const [${node.indexVar}, ${node.itemVar}] of ${node.listExpression}.entries()) {`);
  } else {
    // Array without index
    lines.push(`for (const ${node.itemVar} of ${node.listExpression}) {`);
  }

  let nextIndex = index;
  for (const child of node.body) {
    if (child.type === 'TuiWidgetCall' && !child.isComponent && parentVar) {
      const childVarName = getWidgetVarName(child, nextIndex);
      const result = generateNode(child, nextIndex);
      if (result) {
        for (const l of result.lines) {
          lines.push(`  ${l}`);
        }

        lines.push(`  ${parentVar}.addChild(${childVarName});`);
        nextIndex = result.nextIndex;
      }
    } else {
      const result = generateNode(child, nextIndex);
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

function getWidgetVarName(node: TuiWidgetCall, index: number): string {
  return `__${node.tag.toLowerCase()}${index}`;
}

function hasDynamicBindings(root: TuiRenderRoot): boolean {
  function checkNode(node: TuiRenderNode): boolean {
    if (node.type === 'TuiWidgetCall') {
      return (
        node.dynamicProps.length > 0
        || node.children.some(n => checkNode(n))
      );
    }

    if (node.type === 'TuiConditionalBlock') {
      if (node.consequent.some(n => checkNode(n))) {
        return true;
      }

      if (node.alternate) {
        if (Array.isArray(node.alternate)) {
          return node.alternate.some(n => checkNode(n));
        }

        return checkNode(node.alternate);
      }

      return false;
    }

    if (node.type === 'TuiListBlock') {
      return node.body.some(n => checkNode(n));
    }

    return false;
  }

  return root.children.some(n => checkNode(n));
}

function hasComponentCalls(root: TuiRenderRoot): boolean {
  function checkNode(node: TuiRenderNode): boolean {
    if (node.type === 'TuiWidgetCall') {
      return Boolean(node.isComponent) || node.children.some(n => checkNode(n));
    }

    if (node.type === 'TuiConditionalBlock') {
      if (node.consequent.some(n => checkNode(n))) {
        return true;
      }

      if (node.alternate) {
        if (Array.isArray(node.alternate)) {
          return node.alternate.some(n => checkNode(n));
        }

        return checkNode(node.alternate);
      }

      return false;
    }

    if (node.type === 'TuiListBlock') {
      return node.body.some(n => checkNode(n));
    }

    return false;
  }

  return root.children.some(n => checkNode(n));
}
