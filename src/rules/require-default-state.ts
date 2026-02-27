import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName } from '../utils.js';

type MessageIds = 'missingDefaultState';

export default createRule<[], MessageIds>({
  name: 'require-default-state',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Warn when a state mapping object doesn't have a default ('') key",
    },
    messages: {
      missingDefaultState:
        "State mapping for '{{property}}' has no default ('') value.",
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
        const styleCtx = ctx.getStyleContext(node);
        if (!styleCtx) return;

        // Skip if extending (omitting '' is intentional)
        if (styleCtx.isExtending) return;

        for (const prop of node.properties) {
          if (prop.type !== 'Property' || prop.computed) continue;

          const key = getKeyName(prop.key);
          if (key === null) continue;

          // Skip sub-elements and special keys
          if (/^[A-Z@&$#]/.test(key)) continue;

          if (prop.value.type !== 'ObjectExpression') continue;

          // Check if this object has a '' key
          const hasDefault = prop.value.properties.some((p) => {
            if (p.type !== 'Property') return false;
            const stateKey = p.key.type === 'Literal' ? p.key.value : null;
            return stateKey === '';
          });

          if (!hasDefault) {
            context.report({
              node: prop.value,
              messageId: 'missingDefaultState',
              data: { property: key },
            });
          }
        }
      },
    };
  },
});
