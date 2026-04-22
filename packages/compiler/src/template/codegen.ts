import type {
  TuiRenderRoot,
  TuiWidgetCall,
  TuiRenderNode,
  TuiConditionalBlock,
  TuiListBlock,
} from './ast';

export type CodegenOptions = {
  /** Module ID for the core package import */
  coreModuleId?: string;
  /** Module ID for @vue/reactivity import */
  reactivityModuleId?: string;
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
  const core = options?.coreModuleId ?? 'core';
  const react = options?.reactivityModuleId ?? '@vue/reactivity';
  const imports: string[] = [];
  const lines: string[] = [];

  // Collect imports from used creators
  if (root.usedCreators.size > 0) {
    imports.push(`import { ${[...root.usedCreators].join(', ')} } from '${core}';`);
  }

  // Import reactivity helpers if we have dynamic bindings
  if (root.effects.length > 0 || hasDynamicBindings(root)) {
    imports.push(`import { effect } from '${react}';`);
  }

  // Generate setup function
  lines.push('', 'export function setup(scene) {');

  // Widget declarations
  let widgetIndex = 0;
  for (const child of root.children) {
    const generated = generateNode(child, widgetIndex);
    if (generated) {
      lines.push(...generated.lines.map(l => `  ${l}`));
      widgetIndex = generated.nextIndex;
    }
  }

  // Mount all top-level widgets
  widgetIndex = 0;
  for (const child of root.children) {
    if (child.type === 'TuiWidgetCall') {
      lines.push(`  scene.mount(${getWidgetVarName(child, widgetIndex)});`);
      widgetIndex++;
    } else if (child.type === 'TuiConditionalBlock' || child.type === 'TuiListBlock') {
      // TODO: generate mount logic for conditional/list blocks
      widgetIndex++;
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
  for (const prop of node.props) {
    props.push(`${prop.name}: ${JSON.stringify(prop.value)}`);
  }

  for (const prop of node.dynamicProps) {
    props.push(`${prop.name}: ${prop.expression}`);
  }

  if (props.length > 0) {
    args.push(`{ ${props.join(', ')} }`);
  }

  const lines: string[] = [
    `const ${varName} = ${node.creator}(${args.join(', ')});`,
  ];

  // Generate reactive effect bindings
  for (const prop of node.dynamicProps) {
    // TODO: map prop name to update method
    lines.push(`// TODO: bind :${prop.name} reactively`);
  }

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

function generateConditional(node: TuiConditionalBlock, index: number): NodeGenResult {
  const lines: string[] = [`if (${node.condition}) {`];

  let nextIndex = index;
  for (const child of node.consequent) {
    const result = generateNode(child, nextIndex);
    if (result) {
      for (const l of result.lines) {
        lines.push(`  ${l}`);
      }

      nextIndex = result.nextIndex;
    }
  }

  lines.push('}');

  // TODO: handle alternate (v-else-if / v-else)
  return {lines, nextIndex};
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
  return `${node.tag.toLowerCase()}${index}`;
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
