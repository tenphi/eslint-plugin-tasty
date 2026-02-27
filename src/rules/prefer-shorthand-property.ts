import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName } from '../utils.js';
import { SHORTHAND_MAPPING } from '../constants.js';

type MessageIds = 'preferShorthand';

export default createRule<[], MessageIds>({
  name: 'prefer-shorthand-property',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest tasty shorthand when a native CSS property with a tasty alternative is used',
    },
    messages: {
      preferShorthand:
        "Prefer tasty shorthand '{{alternative}}' instead of '{{native}}'.",
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
          if (key === null) continue;

          const mapping = SHORTHAND_MAPPING[key];
          if (mapping) {
            context.report({
              node: prop.key,
              messageId: 'preferShorthand',
              data: { native: key, alternative: mapping.hint },
            });
          }
        }
      },
    };
  },
});
