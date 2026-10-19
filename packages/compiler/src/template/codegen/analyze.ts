import type {TuiRenderRoot, TuiRenderNode} from '../ast';

export type TreeAnalysis = {
  /**
  Any node carries dynamic (reactive) bindings, or a keyed list exists
  (keyed diffing requires the reactivity effect imports).
  */
  hasDynamicBindings: boolean;
  /**
  Any node is (or contains) a component call, requiring runSetup import.
  */
  hasComponentCalls: boolean;
  /**
  Any component receives dynamic props other than `visible`, requiring
  the reactive() helper import.
  */
  hasDynamicComponentProps: boolean;
};

/**
 Single-pass analysis of the render tree, replacing the three separate
 hasXxx() traversals. All three predicates are evaluated per node in one
 walk; per-node semantics are unchanged.
 */
export function analyzeTree(root: TuiRenderRoot): TreeAnalysis {
  let isDynamicBindings = false;
  let isComponentCalls = false;
  let isDynamicComponentProps = false;

  const visit = (node: TuiRenderNode): void => {
    if (isDynamicBindings && isComponentCalls && isDynamicComponentProps) {
      return;
    }

    switch (node.type) {
      case 'TuiWidgetCall': {
        if (node.dynamicProps.length > 0) {
          isDynamicBindings = true;
        }

        if (node.isComponent === true) {
          isComponentCalls = true;
        }

        if (node.isComponent === true && node.dynamicProps.some(p => p.name !== 'visible')) {
          isDynamicComponentProps = true;
        }

        for (const child of node.children) {
          visit(child);
        }

        break;
      }

      case 'TuiConditionalBlock': {
        for (const child of node.consequent) {
          visit(child);
        }

        if (node.alternate) {
          const alternates = Array.isArray(node.alternate) ? node.alternate : [node.alternate];
          for (const child of alternates) {
            visit(child);
          }
        }

        break;
      }

      case 'TuiListBlock': {
        if (node.keyExpression) {
          isDynamicBindings = true;
        }

        for (const child of node.body) {
          visit(child);
        }

        break;
      }

      case 'TuiDynamicComponent': {
        isDynamicBindings = true;
        isComponentCalls = true;
        if (node.dynamicProps.some(p => p.name !== 'visible')) {
          isDynamicComponentProps = true;
        }

        break;
      }
    }
  };

  for (const child of root.children) {
    visit(child);
  }

  return {hasDynamicBindings: isDynamicBindings, hasComponentCalls: isComponentCalls, hasDynamicComponentProps: isDynamicComponentProps};
}
