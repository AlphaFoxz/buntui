import {RUNTIME_HELPERS} from '../../runtime-helpers';
import type {TuiRenderRoot} from '../ast';
import {generateNode} from './nodes';
import {analyzeTree} from './analyze';
import {getWidgetVarName} from './props';

const {EFFECT, UNREF, REACTIVE} = RUNTIME_HELPERS;

export type CodegenOptions = {
  /**
  Module ID for the core package import
  */
  coreModuleId?: string;
  /**
  Module ID for \@vue/reactivity import
  */
  reactivityModuleId?: string;
  /**
  Script body lines to embed inside setup()
  */
  scriptBody?: string[];
  /**
  Whether the script body uses defineProps() without an explicit import
  */
  usesDefineProps?: boolean;
  /**
  Whether the script body uses defineEmits() without an explicit import
  */
  usesDefineEmits?: boolean;
};

export type CodegenResult = {
  /**
  Full generated code (imports + body, for backward compat)
  */
  code: string;
  /**
  Body lines only (no import statements)
  */
  body: string;
  /**
  Runtime imports needed by the generated code
  */
  imports: string[];
};

/**
 Generate TypeScript source code from a TUI render tree.
 Produces an exportable `setup(scene)` function that creates widgets
 and mounts them to the scene.
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

  // Import reactivity helpers if we have dynamic bindings or component dynamic props
  const analysis = analyzeTree(root);
  if (analysis.hasDynamicComponentProps || root.effects.length > 0 || analysis.hasDynamicBindings) {
    const reactHelpers = analysis.hasDynamicComponentProps ? [EFFECT, UNREF, REACTIVE] : [EFFECT, UNREF];
    imports.push(`import {${reactHelpers.join(', ')}} from '${react}';`);
  }

  // Import runSetup for component lifecycle scoping
  if (analysis.hasComponentCalls) {
    imports.push(`import { runSetup as __runSetup } from '${core}';`);
  }

  // Import defineProps when script uses it without an explicit import
  if (options?.usesDefineProps === true) {
    imports.push(`import { defineProps } from '${core}';`);
  }

  if (options?.usesDefineEmits === true) {
    imports.push(`import { defineEmits } from '${core}';`);
  }

  // Generate setup function
  lines.push('', 'export function setup(__scene, __mt) {', '  const __target = __mt ?? __scene;');

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
    if (!generated) {
      continue;
    }

    const isDeclarative = child.type === 'TuiWidgetCall' && child.isComponent !== true;
    (isDeclarative ? declarativeLines : deferredLines).push(...generated.lines.map(line => `  ${line}`));
    widgetIndex = generated.nextIndex;
  }

  // Emit non-component widget declarations first
  lines.push(...declarativeLines);

  // Mount all top-level non-component widgets (before conditional/component effects run)
  const mountedWidgetVars: string[] = [];
  for (let childIndex = 0; childIndex < root.children.length; childIndex++) {
    const child = root.children[childIndex]!;
    if (child.type !== 'TuiWidgetCall' || child.isComponent === true) {
      continue;
    }

    const varName = getWidgetVarName(child, childStartIndices[childIndex]!);
    lines.push(`  __target.mount(${varName});`);
    mountedWidgetVars.push(varName);
  }

  // Emit conditional blocks and component setups after non-component widgets are mounted
  lines.push(...deferredLines);

  // Return cleanup function so parent v-if can unmount this component's widgets
  const cleanupLines = mountedWidgetVars.map(v => `    __target.unmount(${v});`);
  lines.push('  return () => {', ...cleanupLines, '  };', '}', '', 'export default { setup };');

  const body = lines.join('\n');
  const code = [...imports, body].join('\n');
  return {code, body, imports};
}
