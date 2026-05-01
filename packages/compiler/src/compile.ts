import {baseParse, type RootNode} from '@vue/compiler-core';
import type {SFCDescriptor} from '@vue/compiler-sfc';
import {parse} from './parse';
import {transform, type TransformOptions} from './template/transform';
import {generate, type CodegenOptions} from './template/codegen';

export type CompileOptions = {
  /** SFC parse options */
  filename?: string;
  /** Transform options */
  transform?: TransformOptions;
  /** Codegen options */
  codegen?: CodegenOptions;
};

export type CompileResult = {
  /** Generated TypeScript module code */
  code: string;
  /** Imports used by the generated code */
  imports: string[];
  /** Template AST (if template block exists) */
  templateAst?: RootNode;
  /** Descriptors for each SFC block */
  descriptor: SFCDescriptor;
};

/**
 * Compile a Vue SFC source into a TUI TypeScript module.
 *
 * Pipeline: parse → transform → codegen
 */
export function compile(source: string, options?: CompileOptions): CompileResult {
  // 1. Parse SFC
  const descriptor = parse(source, {filename: options?.filename});

  // 2. Transform template to TUI render tree (once)
  if (!descriptor.template) {
    return {
      code: '// No template block found',
      imports: [],
      descriptor,
    };
  }

  const templateAst = baseParse(descriptor.template.content);
  const renderRoot = transform(templateAst, options?.transform);

  // 3. Split script imports from body
  const scriptContent = descriptor.scriptSetup?.content
    ?? descriptor.script?.content
    ?? '';
  const {scriptImports, scriptBody} = splitScript(scriptContent);

  // 4. Codegen (single pass, with script body if present)
  const codegenResult = generate(renderRoot, {
    ...options?.codegen,
    scriptBody: scriptBody.length > 0 ? scriptBody : undefined,
  });

  // 5. Combine: deduplicate imports, then code
  const allImports = [...codegenResult.imports, ...scriptImports];
  const code = [
    ...allImports,
    '',
    ...codegenResult.code.split('\n').filter(l => !l.startsWith('import ')),
  ].join('\n');

  return {
    code,
    imports: allImports,
    templateAst,
    descriptor,
  };
}

function splitScript(content: string): {scriptImports: string[]; scriptBody: string[]} {
  if (!content) {
    return {scriptImports: [], scriptBody: []};
  }

  const scriptImports: string[] = [];
  const scriptBody: string[] = [];
  for (const line of content.split('\n')) {
    if (line.trimStart().startsWith('import ')) {
      scriptImports.push(line);
    } else {
      scriptBody.push(line);
    }
  }

  return {scriptImports, scriptBody};
}

export {type SFCDescriptor} from '@vue/compiler-sfc';
