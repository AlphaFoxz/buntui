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
  // Text — updateText(val)
  text: {method: 'updateText', field: ''},
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
    // Unref safely unwraps refs (returns raw value for non-refs)
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
