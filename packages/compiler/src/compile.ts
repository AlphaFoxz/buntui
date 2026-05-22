import {baseParse, type RootNode} from '@vue/compiler-core';
import {type SFCDescriptor, type SFCScriptBlock, compileScript} from '@vue/compiler-sfc';
import {parse} from './parse';
import {transform, type TransformOptions} from './template/transform';
import {generate, type CodegenOptions, type CodegenResult} from './template/codegen';
import {type TuiComponentRegistry, CORE_REGISTRY} from './runtime-helpers';

export type CompileOptions = {
  filename?: string;
  registry?: TuiComponentRegistry;
  transform?: Omit<TransformOptions, 'registry' | 'components'>;
  codegen?: CodegenOptions;
};

export type CompileResult = {
  code: string;
  imports: string[];
  templateAst?: RootNode;
  descriptor: SFCDescriptor;
};

type ScriptAnalysis = {
  scriptImports: string[];
  scriptBody: string[];
  componentMap: Record<string, string>;
  widgetImportMap: Record<string, string>;
};

export function compile(source: string, options?: CompileOptions): CompileResult {
  const filename = options?.filename ?? 'anonymous.tui.vue';

  try {
    const descriptor = parse(source, {filename});

    if (!descriptor.template) {
      return {
        code: '// No template block found',
        imports: [],
        descriptor,
      };
    }

    const templateAst = baseParse(descriptor.template.content);

    const registry = options?.registry ?? CORE_REGISTRY;
    const analysis = analyzeScript(descriptor, filename, registry);

    const renderRoot = transform(templateAst, {
      ...options?.transform,
      registry,
      components: analysis.componentMap,
      widgetImports: analysis.widgetImportMap,
    });

    const codegenResult = generate(renderRoot, {
      ...options?.codegen,
      scriptBody: analysis.scriptBody.length > 0 ? analysis.scriptBody : undefined,
    });

    const coreModuleId = options?.codegen?.coreModuleId ?? '@buntui/core';

    return assembleOutput(codegenResult, analysis.scriptImports, descriptor, templateAst, coreModuleId);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw new Error(`${filename} - ${String(error)}`, {cause: error});
    }

    if (!error.message.includes(filename)) {
      error.message = `${filename} - ${error.message}`;
    }

    throw error;
  }
}

function analyzeScript(
  descriptor: SFCDescriptor,
  filename: string,
  registry: TuiComponentRegistry,
): ScriptAnalysis {
  const content = descriptor.scriptSetup?.content
    ?? descriptor.script?.content
    ?? '';

  if (!content) {
    return {
      scriptImports: [], scriptBody: [], componentMap: {}, widgetImportMap: {},
    };
  }

  const {scriptImports, scriptBody} = splitScript(content);

  if (!descriptor.scriptSetup) {
    return {
      scriptImports, scriptBody, componentMap: {}, widgetImportMap: {},
    };
  }

  const {componentMap, widgetImportMap} = analyzeImportsFromAst(descriptor, filename, registry);
  return {
    scriptImports, scriptBody, componentMap, widgetImportMap,
  };
}

function splitScript(content: string): {scriptImports: string[]; scriptBody: string[]} {
  const scriptImports: string[] = [];
  const scriptBody: string[] = [];
  let inMultilineImport = false;

  for (const line of content.split('\n')) {
    if (inMultilineImport) {
      scriptImports.push(line);
      if (line.includes('}')) {
        inMultilineImport = false;
      }

      continue;
    }

    const trimmed = line.trimStart();
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      scriptImports.push(line);
      if (line.includes('{') && !line.includes('}')) {
        inMultilineImport = true;
      }
    } else {
      scriptBody.push(line);
    }
  }

  return {scriptImports, scriptBody};
}

function analyzeImportsFromAst(
  descriptor: SFCDescriptor,
  filename: string,
  registry: TuiComponentRegistry,
): {componentMap: Record<string, string>; widgetImportMap: Record<string, string>} {
  const registryTags = new Set(Object.keys(registry));
  const componentMap: Record<string, string> = {};
  const widgetImportMap: Record<string, string> = {};

  let compiled: SFCScriptBlock;
  try {
    compiled = compileScript(descriptor, {id: filename});
  } catch {
    return {componentMap, widgetImportMap};
  }

  if (!compiled.imports) {
    return {componentMap, widgetImportMap};
  }

  for (const [, info] of Object.entries(compiled.imports)) {
    if (info.isType) {
      continue;
    }

    const templateTag = info.imported === 'default' ? info.local : info.imported;
    const creatorName = info.local;

    if (info.source.endsWith('.vue')) {
      componentMap[templateTag] = creatorName;
      continue;
    }

    if (!registryTags.has(templateTag) && /^[A-Z]/v.test(templateTag)) {
      widgetImportMap[templateTag] = creatorName;
    }
  }

  return {componentMap, widgetImportMap};
}

const BUNTUI_LIFECYCLE_HOOKS = new Set(['onMounted', 'onUnmounted', 'onTick', 'useTemplateRef']);

function assembleOutput(
  codegenResult: CodegenResult,
  scriptImports: string[],
  descriptor: SFCDescriptor,
  templateAst: RootNode,
  coreModuleId: string,
): CompileResult {
  const codegenImportSet = new Set(codegenResult.imports);
  const extraScriptImports = scriptImports
    .filter(i => !codegenImportSet.has(i))
    .map(line => rewriteLifecycleImport(line, coreModuleId));

  const allImports = [...codegenResult.imports, ...extraScriptImports];

  const code = [
    ...allImports,
    codegenResult.body,
  ].join('\n');

  return {
    code,
    imports: allImports,
    templateAst,
    descriptor,
  };
}

export {type SFCDescriptor} from '@vue/compiler-sfc';

function rewriteLifecycleImport(line: string, coreModuleId: string): string {
  // eslint-disable-next-line require-unicode-regexp
  const vueMatch = /^(\s*import\s*{)([^}]+)(}\s*from\s*)['"]vue['"]\s*;?\s*$/.exec(line);
  if (!vueMatch) {
    return line;
  }

  const [, prefix, names, suffix] = vueMatch;
  const nameList = (names ?? '').split(',').map(n => n.trim()).filter(Boolean);
  const buntuiNames: string[] = [];
  const remainingNames: string[] = [];

  for (const name of nameList) {
    if (BUNTUI_LIFECYCLE_HOOKS.has(name)) {
      buntuiNames.push(name);
    } else {
      remainingNames.push(name);
    }
  }

  const lines: string[] = [];
  if (buntuiNames.length > 0) {
    lines.push(`${prefix} ${buntuiNames.join(', ')} ${suffix}'${coreModuleId}';`);
  }

  if (remainingNames.length > 0) {
    lines.push(`${prefix} ${remainingNames.join(', ')} ${suffix}'vue';`);
  }

  return lines.length > 0 ? lines.join('\n') : line;
}
