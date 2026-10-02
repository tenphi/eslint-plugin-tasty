import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { unwrapExpression } from '../utils.js';

type MessageIds = 'styleSpread' | 'preferMergeStyles';

export default createRule<[], MessageIds>({
  name: 'no-style-spread',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn about style spreads and recommend mergeStyles for composition',
    },
    messages: {
      styleSpread:
        'List Tasty style properties explicitly instead of spreading. If this spread is intentional, suppress this warning on this line with an ESLint comment and a reason.',
      preferMergeStyles:
        'Use mergeStyles(...) to compose Tasty style objects. Object spread is shallow and can discard sub-element properties and state-map entries. If shallow replacement is intentional, suppress this warning on this line with a reason.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    const visited = new WeakSet<TSESTree.ObjectExpression>();

    function checkValue(node: TSESTree.Node): void {
      const value = unwrapExpression(node);

      if (value.type === 'ObjectExpression') {
        for (const prop of value.properties) {
          if (prop.type === 'SpreadElement') {
            context.report({ node: prop, messageId: 'styleSpread' });
          } else {
            checkValue(prop.value);
          }
        }
      } else if (value.type === 'ArrayExpression') {
        for (const element of value.elements) {
          if (!element) continue;
          if (element.type === 'SpreadElement') {
            context.report({ node: element, messageId: 'styleSpread' });
          } else {
            checkValue(element);
          }
        }
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression): void {
      if (visited.has(node)) return;
      const styleCtx = ctx.getStyleContext(node);
      // tastyStatic rejects spreads during extraction, so its existing error
      // gives the useful diagnostic without a second warning.
      if (!styleCtx || styleCtx.isStaticCall) return;
      if (ctx.getRootStyleObject(node) !== node) return;
      visited.add(node);

      const spreads = node.properties.filter(
        (prop): prop is TSESTree.SpreadElement => prop.type === 'SpreadElement',
      );
      if (spreads.length < 2) {
        checkValue(node);
        return;
      }

      // Report composition once, at its first spread so the existing per-line
      // suppression convention still works. Nested state maps/arrays are not
      // Styles objects and must keep their ordinary spread diagnostics.
      context.report({ node: spreads[0], messageId: 'preferMergeStyles' });
      for (const prop of node.properties) {
        if (prop.type === 'Property') checkValue(prop.value);
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      VariableDeclarator(node) {
        if (!node.init) return;
        // The shared selectors cover only one as/satisfies wrapper. Typed
        // composition can also have nested wrappers or a non-null assertion.
        const value = unwrapExpression(node.init);
        if (value.type === 'ObjectExpression') handleStyleObject(value);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
