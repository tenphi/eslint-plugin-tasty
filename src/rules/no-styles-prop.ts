import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';

type MessageIds = 'noStylesProp';

export default createRule<[], MessageIds>({
  name: 'no-styles-prop',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Discourage using the styles prop directly on components',
    },
    messages: {
      noStylesProp:
        "Avoid using 'styles' prop directly. Create a styled wrapper with tasty(Component, { styles: ... }) instead.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'styles' &&
          node.value?.type === 'JSXExpressionContainer' &&
          node.value.expression.type === 'ObjectExpression'
        ) {
          context.report({
            node,
            messageId: 'noStylesProp',
          });
        }
      },
    };
  },
});
