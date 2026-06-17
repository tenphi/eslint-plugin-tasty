import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
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
        "State mapping for '{{property}}' has no default ('') or fallback floor ('_') value.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function handleStyleObject(node: TSESTree.ObjectExpression) {
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

        // A '' default or a '_' fallback floor both provide a value in the
        // normal state, so either one satisfies the requirement.
        const hasDefault = prop.value.properties.some((p) => {
          if (p.type !== 'Property' || p.computed) return false;
          const stateKey = getKeyName(p.key);
          return stateKey === '' || stateKey === '_';
        });

        if (!hasDefault) {
          context.report({
            node: prop.value,
            messageId: 'missingDefaultState',
            data: { property: key },
          });
        }
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
