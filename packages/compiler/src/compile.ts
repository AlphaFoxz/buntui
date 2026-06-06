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
  moduleRewrites?: Record<string, string>;
  symbolRedirects?: Record<string, string>;
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

const DEFAULT_MODULE_REWRITES: Record<string, string> = {
  vue: '@vue/reactivity',
};

const DEFAULT_SYMBOL_REDIRECTS: Record<string, string> = {
  onMounted: '@buntui/core',
  onUnmounted: '@buntui/core',
  onTick: '@buntui/core',
  useTemplateRef: '@buntui/core',
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
    const moduleRewrites = {...DEFAULT_MODULE_REWRITES, ...options?.moduleRewrites};
    const symbolRedirects = {...DEFAULT_SYMBOL_REDIRECTS, ...options?.symbolRedirects};

    return assembleOutput(codegenResult, analysis.scriptImports, descriptor, templateAst, {coreModuleId, moduleRewrites, symbolRedirects});
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

type RewriteContext = {
  coreModuleId: string;
  moduleRewrites: Record<string, string>;
  symbolRedirects: Record<string, string>;
};

function assembleOutput(
  codegenResult: CodegenResult,
  scriptImports: string[],
  descriptor: SFCDescriptor,
  templateAst: RootNode,
  rewriteCtx: RewriteContext,
): CompileResult {
  const codegenImportSet = new Set(codegenResult.imports);
  const extraScriptImports = scriptImports
    .filter(i => !codegenImportSet.has(i))
    .flatMap(line => rewriteImport(line, rewriteCtx));

  const allImports = [...codegenResult.imports, ...extraScriptImports];

  const jsCode = [
    ...allImports,
    codegenResult.body,
  ].join('\n');

  const code = stripTypeScript(jsCode);

  return {
    code,
    imports: allImports,
    templateAst,
    descriptor,
  };
}

export {type SFCDescriptor} from '@vue/compiler-sfc';

function parseImportName(raw: string): {original: string; local: string} {
  const parts = raw.split(/\s+as\s+/v);
  return {original: parts[0]!.trim(), local: parts.length > 1 ? parts[1]!.trim() : parts[0]!.trim()};
}

function rewriteImport(
  line: string,
  ctx: RewriteContext,
): string[] {
  // eslint-disable-next-line require-unicode-regexp
  const match = /^(\s*import\s*{)([^}]+)(}\s*from\s*)['"]([^'"]+)['"]\s*;?\s*$/.exec(line);
  if (!match) {
    return [line];
  }

  const [, prefix, names, suffix, sourceModule = ''] = match;
  const nameList = (names ?? '').split(',').map(n => n.trim()).filter(Boolean);
  const parsedNames = nameList.map(n => parseImportName(n));

  const needsModuleRewrite = sourceModule in ctx.moduleRewrites;
  const needsSymbolSplit = parsedNames.some(n => n.original in ctx.symbolRedirects);
  if (!needsModuleRewrite && !needsSymbolSplit) {
    return [line];
  }

  const groups = new Map<string, string[]>();
  for (const {original, local} of parsedNames) {
    const target = ctx.symbolRedirects[original] ?? sourceModule;
    const displayName = original === local ? original : `${original} as ${local}`;
    let group = groups.get(target);
    if (!group) {
      group = [];
      groups.set(target, group);
    }

    group.push(displayName);
  }

  const lines: string[] = [];
  for (const [target, groupNames] of groups) {
    const resolvedTarget = target === sourceModule
      ? (ctx.moduleRewrites[sourceModule] ?? sourceModule)
      : target.replace('@buntui/core', ctx.coreModuleId);
    lines.push(`${prefix!} ${groupNames.join(', ')} ${suffix!}'${resolvedTarget}';`);
  }

  return lines.length > 0 ? lines : [line];
}

function stripTypeScript(code: string): string {
  const lines = code.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trimStart();

    if (/^import\s+type\s+/.test(trimmed)) {
      continue;
    }

    if (/^import\s/.test(trimmed)) {
      out.push(line);
      continue;
    }

    let result = line;

    result = result.replaceAll(/(function\s+\w+)\s*\(([^)]*)\)/g, (_full: string, prefix: string, parameters: string) => {
      const cleaned = stripParameterTypes(parameters);
      return `${prefix}(${cleaned})`;
    });

    result = result.replaceAll(/\bas\s+([A-Z]\w*(?:<[^>]*>)?|const|unknown|any|string|number|boolean|void|never|null|undefined|object)(?![$\w])/g, '');
    result = result.replaceAll(/([)\w\]])!(?!=)/g, '$1');

    out.push(result);
  }

  return out.join('\n');
}

function stripParameterTypes(parameters: string): string {
  const cleaned: string[] = [];
  let depth = 0;
  let current = '';
  let i = 0;

  while (i < parameters.length) {
    const ch = parameters[i];

    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      current += ch;
      i++;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      current += ch;
      i++;
    } else if (depth === 0 && ch === ':') {
      let name = current.trim();
      if (name.endsWith('?')) {
        name = name.slice(0, -1);
      }

      cleaned.push(name || current);
      current = '';

      i = skipTypeAnnotation(parameters, i + 1);
    } else if (depth === 0 && ch === ',' && isTopLevelComma(parameters, i)) {
      if (current.trim()) {
        cleaned.push(current.trim());
      }

      current = '';
      i++;
      while (i < parameters.length && parameters[i] === ' ') {
        i++;
      }
    } else {
      current += ch;
      i++;
    }
  }

  if (current.trim()) {
    cleaned.push(current.trim());
  }

  return cleaned.join(', ');
}

function skipTypeAnnotation(parameters: string, start: number): number {
  let depth = 0;
  let i = start;

  while (i < parameters.length) {
    const ch = parameters[i];

    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') {
      depth++;
      i++;
    } else if (ch === ')' || ch === ']' || ch === '}' || ch === '>') {
      if (depth > 0) {
        depth--;
        i++;
      } else {
        break;
      }
    } else if (depth === 0 && ch === ',') {
      break;
    } else if (depth === 0 && ch === '=' && !isArrowContext(parameters, i)) {
      break;
    } else {
      i++;
    }
  }

  return i;
}

function isTopLevelComma(parameters: string, index: number): boolean {
  let depth = 0;
  for (let j = 0; j < index; j++) {
    const ch = parameters[j]!;
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') {
      depth++;
    } else if (ch === ')' || ch === ']' || ch === '}' || ch === '>') {
      depth--;
    }
  }

  return depth === 0;
}

function isArrowContext(parameters: string, index: number): boolean {
  return index + 1 < parameters.length && parameters[index + 1] === '>';
}
