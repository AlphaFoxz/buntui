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
  // Rect — updateRect({rectX: val})
  rectX: {method: 'updateRect', field: 'rectX'},
  rectY: {method: 'updateRect', field: 'rectY'},
  rectWidth: {method: 'updateRect', field: 'rectWidth'},
  rectHeight: {method: 'updateRect', field: 'rectHeight'},
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
  // Box — updateText(val)
  text: {method: 'updateText', field: ''},
};

// Flag props that map to setter calls instead of constructor args
const FLAG_PROP_MAP: Record<string, string> = {
  draggable: 'setDraggable',
};

export type CodegenOptions = {
  /** Module ID for the core package import */
  coreModuleId?: string;
  /** Module ID for @vue/reactivity import */
  reactivityModuleId?: string;
  /** Script body lines to embed inside setup() */
  scriptBody?: string[];
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

  // Collect imports from used creators
  if (root.usedCreators.size > 0) {
    imports.push(`import { ${[...root.usedCreators].join(', ')} } from '${core}';`);
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
  for (let childIndex = 0; childIndex < root.children.length; childIndex++) {
    const child = root.children[childIndex]!;
    if (child.type === 'TuiWidgetCall') {
      lines.push(`  scene.mount(${getWidgetVarName(child, childStartIndices[childIndex]!)});`);
    }
  }

  lines.push('}');

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
  const varName = getWidgetVarName(node, index);
  const args: string[] = [];

  // Build options object from props
  const props: string[] = [];
  const flagLines: string[] = [];
  for (const prop of node.props) {
    const setter = FLAG_PROP_MAP[prop.name];
    if (setter) {
      flagLines.push(`${varName}.${setter}(${prop.value === 'true'});`);
    } else {
      props.push(`${prop.name}: ${JSON.stringify(prop.value)}`);
    }
  }

  for (const prop of node.dynamicProps) {
    const setter = FLAG_PROP_MAP[prop.name];
    if (setter) {
      flagLines.push(`${varName}.${setter}(unref(${prop.expression}));`);
    } else {
      // Unref safely unwraps refs (returns raw value for non-refs)
      props.push(`${prop.name}: unref(${prop.expression})`);
    }
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
    if (!info) {
      continue;
    }

    if (info.field) {
      // Grouped prop: widget.updateRect({rectX: unref(expr)})
      lines.push(`effect(() => { ${varName}.${info.method}({${info.field}: unref(${prop.expression})}); });`);
    } else {
      // Primitive prop: widget.updateText(unref(expr))
      lines.push(`effect(() => { ${varName}.${info.method}(unref(${prop.expression})); });`);
    }
  }

  // Generate event handler registrations
  for (const eventBinding of node.events) {
    lines.push(`${varName}.on('${eventBinding.event}', ${eventBinding.handler});`);
  }

  // Generate flag prop setter calls
  lines.push(...flagLines);

  // Generate children
  let nextIndex = index + 1;
  for (const child of node.children) {
    const result = generateNode(child, nextIndex);
    if (result) {
      lines.push(...result.lines);
      nextIndex = result.nextIndex;
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
  flagLines: string[];
};

function generateConditional(block: TuiConditionalBlock, index: number): NodeGenResult {
  const branches = flattenConditional(block);
  const lines: string[] = [];
  let nextIndex = index;

  // Collect widget creation info per branch
  const branchWidgets: WidgetInfo[][] = [];

  for (const branch of branches) {
    const widgets: WidgetInfo[] = [];
    for (const node of branch.nodes) {
      const varName = getWidgetVarName(node, nextIndex);
      const createLine = buildWidgetCreation(node);
      const updateEffects = buildGuardedUpdateEffects(node, varName);
      const eventLines = buildEventLines(node, varName);
      const flagLines = buildFlagLines(node, varName);
      widgets.push({varName, createLine, updateEffects, eventLines, flagLines});
      nextIndex++;
    }

    branchWidgets.push(widgets);
  }

  // Declare all vars as null
  for (const bw of branchWidgets) {
    for (const w of bw) {
      lines.push(`let ${w.varName} = null;`);
    }
  }

  // Generate the toggle effect: if/else-if/else chain
  const effectLines: string[] = [];

  for (let i = 0; i < branches.length; i++) {
    const {condition} = branches[i]!;
    const keyword = i === 0 ? 'if' : (condition ? 'else if' : 'else');
    const condPart = condition ? ` (unref(${condition}))` : '';

    effectLines.push(`${keyword}${condPart} {`);

    // Mount this branch's widgets
    for (const w of branchWidgets[i]!) {
      effectLines.push(
        `    if (!${w.varName}) {`,
        `      ${w.varName} = ${w.createLine};`,
      );
      for (const eventLine of w.eventLines) {
        effectLines.push(`      ${eventLine}`);
      }

      for (const flagLine of w.flagLines) {
        effectLines.push(`      ${flagLine}`);
      }

      effectLines.push(
        `      scene.mount(${w.varName});`,
        '    }',
      );
    }

    // Unmount other branches' widgets
    for (let j = 0; j < branches.length; j++) {
      if (j === i) {
        continue;
      }

      for (const w of branchWidgets[j]!) {
        effectLines.push(
          `    if (${w.varName}) {`,
          `      scene.unmount(${w.varName});`,
          `      ${w.varName} = null;`,
          '    }',
        );
      }
    }

    effectLines.push('}');
  }

  // If last branch has a condition (no v-else), add final else to unmount all
  const lastBranch = branches.at(-1)!;
  if (lastBranch.condition !== null) {
    effectLines.push(' else {');
    for (const bw of branchWidgets) {
      for (const w of bw) {
        effectLines.push(
          `    if (${w.varName}) {`,
          `      scene.unmount(${w.varName});`,
          `      ${w.varName} = null;`,
          '    }',
        );
      }
    }

    effectLines.push('}');
  }

  lines.push('effect(() => {');
  for (const l of effectLines) {
    lines.push(`  ${l}`);
  }

  lines.push('});');

  // Guarded update effects for dynamic props
  for (const bw of branchWidgets) {
    for (const w of bw) {
      lines.push(...w.updateEffects);
    }
  }

  return {lines, nextIndex};
}

function buildWidgetCreation(node: TuiWidgetCall): string {
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
  const effects: string[] = [];
  for (const prop of node.dynamicProps) {
    const info = PROP_UPDATE_MAP[prop.name];
    if (!info) {
      continue;
    }

    if (info.field) {
      effects.push(`effect(() => { if (${varName}) { ${varName}.${info.method}({${info.field}: unref(${prop.expression})}); } });`);
    } else {
      effects.push(`effect(() => { if (${varName}) { ${varName}.${info.method}(unref(${prop.expression})); } });`);
    }
  }

  return effects;
}

function buildEventLines(node: TuiWidgetCall, varName: string): string[] {
  const result: string[] = [];
  for (const eventBinding of node.events) {
    result.push(`${varName}.on('${eventBinding.event}', ${eventBinding.handler});`);
  }

  return result;
}

function buildFlagLines(node: TuiWidgetCall, varName: string): string[] {
  const result: string[] = [];
  for (const prop of node.props) {
    const setter = FLAG_PROP_MAP[prop.name];
    if (setter) {
      result.push(`${varName}.${setter}(${prop.value === 'true'});`);
    }
  }

  for (const prop of node.dynamicProps) {
    const setter = FLAG_PROP_MAP[prop.name];
    if (setter) {
      result.push(`${varName}.${setter}(unref(${prop.expression}));`);
    }
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
