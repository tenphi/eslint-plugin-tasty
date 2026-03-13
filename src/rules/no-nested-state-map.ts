import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName } from '../utils.js';

type MessageIds = 'nestedStateMap';

export default createRule<[], MessageIds>({
  name: 'no-nested-state-map',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent state mapping objects inside state mapping objects',
    },
    messages: {
      nestedStateMap:
        "Nested state maps are not allowed. Use combined state keys instead (e.g., 'hovered & pressed').",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        // Skip sub-elements and special keys
        if (/^[A-Z@&]/.test(key)) continue;

        // If value is an object (state map), check for nested objects
        if (prop.value.type !== 'ObjectExpression') continue;

        for (const stateProp of prop.value.properties) {
          if (stateProp.type !== 'Property') continue;

          if (stateProp.value.type === 'ObjectExpression') {
            context.report({
              node: stateProp.value,
              messageId: 'nestedStateMap',
            });
          }
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
