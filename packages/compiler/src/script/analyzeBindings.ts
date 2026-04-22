import type {SFCScriptBlock} from '@vue/compiler-sfc';
import type {ScriptBinding} from '../template/ast';

export type BindingAnalysisResult = {
  bindings: ScriptBinding[];
  setupExports: string[];
  imports: ImportInfo[];
};

export type ImportInfo = {
  source: string;
  names: string[];
  isDefault: boolean;
};

/**
 * Analyze a <script setup> block to extract reactive bindings.
 * Returns metadata about refs, computed, imports, and exported values.
 */
// export function analyzeBindings(_scripts: SFCScriptBlock): BindingAnalysisResult {
export function analyzeBindings(scriptBlock: SFCScriptBlock | null): BindingAnalysisResult {
  if (!scriptBlock) {
    // TODO: Parse script AST to extract:
    //  - ref() / computed() declarations
    //  - import statements (from core, @vue/reactivity, etc.)
    //  - defineProps / defineEmits macros
    //  - Top-level const/let/var declarations
  }

  return {
    bindings: [],
    setupExports: [],
    imports: [],
  };
}
