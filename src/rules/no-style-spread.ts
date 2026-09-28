import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { unwrapExpression } from '../utils.js';

type MessageIds = 'styleSpread';

export default createRule<[], MessageIds>({
  name: 'no-style-spread',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn about spreads inside Tasty style objects',
    },
    messages: {
      styleSpread:
        'List Tasty style properties explicitly instead of spreading. If this spread is intentional, suppress this warning on this line with an ESLint comment and a reason.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

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
      const styleCtx = ctx.getStyleContext(node);
      // tastyStatic rejects spreads during extraction, so its existing error
      // gives the useful diagnostic without a second warning.
      if (!styleCtx || styleCtx.isStaticCall) return;
      if (ctx.getRootStyleObject(node) !== node) return;

      checkValue(node);
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
