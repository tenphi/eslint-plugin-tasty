import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName } from '../utils.js';

type MessageIds = 'noNestedSelector';

export default createRule<[], MessageIds>({
  name: 'no-nested-selector',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Discourage &-prefixed nested selectors in favor of sub-element styling',
    },
    messages: {
      noNestedSelector:
        "Avoid nested selectors ('{{key}}'). Use sub-element styling with capitalized keys and data-element attributes instead.",
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

          if (key.startsWith('&') && !key.startsWith('&::')) {
            context.report({
              node: prop.key,
              messageId: 'noNestedSelector',
              data: { key },
            });
          }
        }
      },
    };
  },
});
