import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName } from '../utils.js';

type MessageIds = 'subElementNotObject';

export default createRule<[], MessageIds>({
  name: 'valid-sub-element',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate sub-element key format in style objects',
    },
    messages: {
      subElementNotObject:
        "Sub-element '{{name}}' value must be a style object, not a {{type}}.",
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

      'CallExpression ObjectExpression'(node: TSESTree.ObjectExpression) {
        if (!ctx.isStyleObject(node)) return;

        for (const prop of node.properties) {
          if (prop.type !== 'Property' || prop.computed) continue;

          const key = getKeyName(prop.key);
          if (key === null || !/^[A-Z]/.test(key)) continue;

          if (prop.value.type !== 'ObjectExpression') {
            const valueType =
              prop.value.type === 'Literal'
                ? typeof prop.value.value
                : prop.value.type;

            context.report({
              node: prop.value,
              messageId: 'subElementNotObject',
              data: { name: key, type: valueType },
            });
          }
        }
      },
    };
  },
});
