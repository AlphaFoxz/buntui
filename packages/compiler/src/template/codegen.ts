import type {
  TuiRenderRoot,
  TuiWidgetCall,
  TuiRenderNode,
  TuiConditionalBlock,
  TuiListBlock,
} from './ast';

/**
 * Maps widget prop names to their runtime update method.
 * Grouped props (rect, color, etc.) use partial-object update methods.
 * Primitive props (text) use direct-value update methods.
 */
const PROP_UPDATE_MAP: Record<string, {method: string; field: string}> = {
  // Rect — updateRect({x: val})
  x: {method: 'updateRect', field: 'x'},
  y: {method: 'updateRect', field: 'y'},
  width: {method: 'updateRect', field: 'width'},
  height: {method: 'updateRect', field: 'height'},
  // Color — updateColor({colorFg: val})
  colorFg: {method: 'updateColor', field: 'colorFg'},
  colorBg: {method: 'updateColor', field: 'colorBg'},
  // Style — updateStyle({styleZIndex: val})
  styleZIndex: {method: 'updateStyle', field: 'styleZIndex'},
  styleModifier: {method: 'updateStyle', field: 'styleModifier'},
  // Border — updateBorder({borderColor: val})
  borderColor: {method: 'updateBorder', field: 'borderColor'},
  borderStyle: {method: 'updateBorder', field: 'borderStyle'},
  borderTop: {method: 'updateBorder', field: 'borderTop'},
  borderRight: {method: 'updateBorder', field: 'borderRight'},
  borderBottom: {method: 'updateBorder', field: 'borderBottom'},
  borderLeft: {method: 'updateBorder', field: 'borderLeft'},
  // Shadow — updateShadow({shadowOffsetX: val})
  shadowOffsetX: {method: 'updateShadow', field: 'shadowOffsetX'},
  shadowOffsetY: {method: 'updateShadow', field: 'shadowOffsetY'},
  shadowColor: {method: 'updateShadow', field: 'shadowColor'},
  shadowCovered: {method: 'updateShadow', field: 'shadowCovered'},
  // Text — updateValue(val)
  value: {method: 'updateValue', field: ''},
  // Stack layout — updateDirection(val)
  direction: {method: 'updateDirection', field: ''},
  gap: {method: 'updateGap', field: ''},
  align: {method: 'updateAlign', field: ''},
  // Padding — updatePadding({paddingTop: val})
  paddingTop: {method: 'updatePadding', field: 'paddingTop'},
  paddingRight: {method: 'updatePadding', field: 'paddingRight'},
  paddingBottom: {method: 'updatePadding', field: 'paddingBottom'},
  paddingLeft: {method: 'updatePadding', field: 'paddingLeft'},
};

// Flag props that map to setter calls for reactive updates.
// These props are passed to the constructor for initial values and use
// setter methods for reactive effect generation on dynamic bindings.
const FLAG_PROP_MAP: Record<string, string> = {
  draggable: 'setDraggable',
  disabled: 'setDisabled',
  checked: 'setChecked',
  readonly: 'setReadonly',
  label: 'setLabel',
  tabs: 'setOptions',
  options: 'setOptions',
};

// Props that are boolean flags (bare attrs like `readonly` parse as string "true").
// Only these need string→bool conversion. Other FLAG_PROP_MAP entries (label, options)
// are string/array props and should be passed as-is.
const BOOLEAN_FLAGS = new Set(['disabled', 'checked', 'readonly', 'draggable']);

export type CodegenOptions = {
  /** Module ID for the core package import */
  coreModuleId?: string;
  /** Module ID for @vue/reactivity import */
  reactivityModuleId?: string;
  /** Script body lines to embed inside setup() */
  scriptBody?: string[];
  /** Override import source for specific widget creators (creator name → module ID) */
  widgetModuleMap?: Record<string, string>;
};

export type CodegenResult = {
  code: string;
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
      const mod = options?.widgetModuleMap?.[creator] ?? core;
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
    imports.push(`import {effect, unref} from '${react}';`);
  }

  // Generate setup function
  lines.push('', 'export function setup(scene) {');

  // Embed script body inside setup() so side effects (setInterval, etc.)
  // are scoped to the setup call, not module-level
  if (options?.scriptBody && options.scriptBody.length > 0) {
    for (const line of options.scriptBody) {
      lines.push(`  ${line}`);
    }
  }

  // Widget declarations
  let widgetIndex = 0;
  const childStartIndices: number[] = [];
  for (const child of root.children) {
    childStartIndices.push(widgetIndex);
    const generated = generateNode(child, widgetIndex);
    if (generated) {
      lines.push(...generated.lines.map(l => `  ${l}`));
      widgetIndex = generated.nextIndex;
    }
  }

  // Mount all top-level widgets (conditional blocks handle their own mounting)
  const mountedWidgetVars: string[] = [];
  for (let childIndex = 0; childIndex < root.children.length; childIndex++) {
    const child = root.children[childIndex]!;
    if (child.type === 'TuiWidgetCall' && !child.isComponent) {
      const varName = getWidgetVarName(child, childStartIndices[childIndex]!);
      lines.push(`  scene.mount(${varName});`);
      mountedWidgetVars.push(varName);
    }
  }

  // Return cleanup function so parent v-if can unmount this component's widgets
  const cleanupLines = mountedWidgetVars.map(v => `    scene.unmount(${v});`);
  lines.push('  return () => {', ...cleanupLines, '  };', '}', '', 'export default { setup };');

  const code = [...imports, ...lines].join('\n');
  return {code, imports};
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
  // Component call: ImportName.setup(scene)
  if (node.isComponent) {
    return {
      lines: [`${node.creator}.setup(scene);`],
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
    props.push(`${prop.name}: unref(${prop.expression})`);
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
        // Grouped prop: widget.updateRect({x: unref(expr)})
        lines.push(`effect(() => { ${varName}.${info.method}({${info.field}: unref(${prop.expression})}); });`);
      } else {
        // Primitive prop: widget.updateText(unref(expr))
        lines.push(`effect(() => { ${varName}.${info.method}(unref(${prop.expression})); });`);
      }

      continue;
    }

    // Flag props (disabled, checked, etc.): reactive setter calls
    const setter = FLAG_PROP_MAP[prop.name];
    if (setter) {
      lines.push(`effect(() => { ${varName}.${setter}(unref(${prop.expression})); });`);
    }
  }

  // Generate event handler registrations
  for (const eventBinding of node.events) {
    lines.push(`${varName}.on('${eventBinding.event}', ${eventBinding.handler});`);
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

const CONDITION_KEYWORDS = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'typeof',
  'void',
  'in',
  'of',
  'instanceof',
  'new',
  'delete',
  'return',
  'throw',
]);

function wrapConditionExpr(expr: string): string {
  return expr.replaceAll(
    /'[^']*'|"[^"]*"|\b([a-zA-Z_$][\w$]*)\b/gv,
    (match, ident: string | undefined, offset: number) => {
      if (ident === undefined) {
        return match; // String literal
      }

      if (offset > 0 && expr[offset - 1] === '.') {
        return match; // Property access
      }

      if (CONDITION_KEYWORDS.has(ident)) {
        return match;
      }

      return `unref(${ident})`;
    },
  );
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
      effectLines.push(`    if (!${tree.root.varName}) {`, `      ${tree.root.varName} = ${tree.root.createLine};`);
      for (const d of tree.descendants) {
        effectLines.push(`      ${d.varName} = ${d.createLine};`);
      }

      // Add children to parents
      for (const addLine of tree.addChildLines) {
        effectLines.push(`      ${addLine}`);
      }

      // Events for root
      for (const eventLine of tree.root.eventLines) {
        effectLines.push(`      ${eventLine}`);
      }

      // Events for descendants
      for (const d of tree.descendants) {
        for (const eventLine of d.eventLines) {
          effectLines.push(`      ${eventLine}`);
        }
      }

      // Components return a cleanup function and mount internally — skip scene.mount
      if (tree.root.isComponent) {
        effectLines.push('    }');
      } else {
        effectLines.push(`      scene.mount(${tree.root.varName});`, '    }');
      }
    }

    // Unmount other branches' widgets
    for (let j = 0; j < branches.length; j++) {
      if (j === i) {
        continue;
      }

      for (const tree of branchTrees[j]!) {
        // Components: call cleanup function returned by setup()
        if (tree.root.isComponent) {
          effectLines.push(
            `    if (${tree.root.varName}) {`,
            `      ${tree.root.varName}();`,
            `      ${tree.root.varName} = null;`,
          );
        } else {
          effectLines.push(
            `    if (${tree.root.varName}) {`,
            `      scene.unmount(${tree.root.varName});`,
            `      ${tree.root.varName} = null;`,
          );
        }

        for (const d of tree.descendants) {
          effectLines.push(`      ${d.varName} = null;`);
        }

        effectLines.push('    }');
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
        if (tree.root.isComponent) {
          effectLines.push(
            `    if (${tree.root.varName}) {`,
            `      ${tree.root.varName}();`,
            `      ${tree.root.varName} = null;`,
          );
        } else {
          effectLines.push(
            `    if (${tree.root.varName}) {`,
            `      scene.unmount(${tree.root.varName});`,
            `      ${tree.root.varName} = null;`,
          );
        }

        for (const d of tree.descendants) {
          effectLines.push(`      ${d.varName} = null;`);
        }

        effectLines.push('    }');
      }
    }

    effectLines.push('}');
  }

  lines.push('effect(() => {');
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
    return `${node.creator}.setup(scene)`;
  }

  const props: string[] = [];
  for (const prop of node.props) {
    if (FLAG_PROP_MAP[prop.name]) {
      continue;
    }

    props.push(`${prop.name}: ${JSON.stringify(prop.value)}`);
  }

  for (const prop of node.dynamicProps) {
    props.push(`${prop.name}: unref(${prop.expression})`);
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
        effects.push(`effect(() => { if (${varName}) { ${varName}.${info.method}({${info.field}: unref(${prop.expression})}); } });`);
      } else {
        effects.push(`effect(() => { if (${varName}) { ${varName}.${info.method}(unref(${prop.expression})); } });`);
      }

      continue;
    }

    const setter = FLAG_PROP_MAP[prop.name];
    if (setter) {
      effects.push(`effect(() => { if (${varName}) { ${varName}.${setter}(unref(${prop.expression})); } });`);
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
    result.push(`${varName}.on('${eventBinding.event}', ${eventBinding.handler});`);
  }

  return result;
}

function generateList(node: TuiListBlock, index: number): NodeGenResult {
  const lines: string[] = [];
  const indexExpr = node.indexVar ? `, ${node.indexVar}` : '';
  lines.push(`for (const [${node.itemVar}${indexExpr}] of ${node.listExpression}.entries()) {`);

  let nextIndex = index;
  for (const child of node.body) {
    const result = generateNode(child, nextIndex);
    if (result) {
      for (const l of result.lines) {
        lines.push(`  ${l}`);
      }

      nextIndex = result.nextIndex;
    }
  }

  lines.push('}');

  return {lines, nextIndex};
}

function getWidgetVarName(node: TuiWidgetCall, index: number): string {
  return `_${node.tag.toLowerCase()}${index}`;
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
      return node.consequent.some(n => checkNode(n));
    }

    if (node.type === 'TuiListBlock') {
      return node.body.some(n => checkNode(n));
    }

    return false;
  }

  return root.children.some(n => checkNode(n));
}
