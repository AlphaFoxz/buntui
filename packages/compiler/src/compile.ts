import {baseParse, type RootNode} from '@vue/compiler-core';
import type {SFCDescriptor} from '@vue/compiler-sfc';
import {parse} from './parse';
import {transform, type TransformOptions} from './template/transform';
import {generate, type CodegenOptions, type CodegenResult} from './template/codegen';
import {analyzeBindings, type BindingAnalysisResult} from './script/analyzeBindings';

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
  /** Script binding analysis (if script block exists) */
  bindings?: BindingAnalysisResult;
  /** Descriptors for each SFC block */
  descriptor: SFCDescriptor;
};

/**
 * Compile a Vue SFC source into a TUI TypeScript module.
 *
 * Pipeline: parse → analyze script → transform template → codegen
 */
export function compile(source: string, options?: CompileOptions): CompileResult {
  // 1. Parse SFC
  const descriptor = parse(source, {filename: options?.filename});

  // 2. Analyze script setup bindings
  let bindings: BindingAnalysisResult | undefined;
  if (descriptor.scriptSetup) {
    bindings = analyzeBindings(descriptor.scriptSetup);
  }

  // 3. Transform template to TUI render tree
  let templateAst: RootNode | undefined;
  let codegenResult: CodegenResult;

  if (descriptor.template) {
    templateAst = baseParse(descriptor.template.content);

    const renderRoot = transform(templateAst, options?.transform);
    codegenResult = generate(renderRoot, options?.codegen);
  } else {
    codegenResult = {code: '// No template block found', imports: []};
  }

  // 4. Combine script + template code
  const scriptContent = descriptor.scriptSetup?.content
    ?? descriptor.script?.content
    ?? '';

  const code = scriptContent
    ? `${scriptContent}\n\n${codegenResult.code}`
    : codegenResult.code;

  return {
    code,
    imports: codegenResult.imports,
    templateAst,
    bindings,
    descriptor,
  };
}

export {type SFCDescriptor} from '@vue/compiler-sfc';
