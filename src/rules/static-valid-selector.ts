import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getStringValue, isValidSelector } from '../utils.js';

type MessageIds = 'invalidSelector' | 'selectorNotString';

export default createRule<[], MessageIds>({
  name: 'static-valid-selector',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate the selector string in tastyStatic(selector, styles) calls',
    },
    messages: {
      invalidSelector: 'Invalid CSS selector: {{reason}}',
      selectorNotString: 'tastyStatic() selector must be a string literal.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },

      CallExpression(node: TSESTree.CallExpression) {
        const imp = ctx.isTastyCall(node);
        if (!imp || imp.importedName !== 'tastyStatic') return;

        // Only check selector mode: tastyStatic(selector, styles)
        if (node.arguments.length !== 2) return;

        const firstArg = node.arguments[0];

        // Must be a string literal
        const selectorValue = getStringValue(firstArg);
        if (selectorValue === null) {
          // Could be a StaticStyle object (extending), which is fine
          if (
            firstArg.type === 'Identifier' ||
            firstArg.type === 'MemberExpression'
          ) {
            return;
          }

          context.report({
            node: firstArg,
            messageId: 'selectorNotString',
          });
          return;
        }

        const error = isValidSelector(selectorValue);
        if (error) {
          context.report({
            node: firstArg,
            messageId: 'invalidSelector',
            data: { reason: error },
          });
        }
      },
    };
  },
});
