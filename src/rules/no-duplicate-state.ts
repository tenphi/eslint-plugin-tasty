import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';

type MessageIds = 'duplicateState';

export default createRule<[], MessageIds>({
  name: 'no-duplicate-state',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when the same state key appears more than once in a style mapping',
    },
    messages: {
      duplicateState: "Duplicate state key '{{key}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkDuplicates(obj: TSESTree.ObjectExpression): void {
      const seen = new Map<string, TSESTree.Node>();

      for (const prop of obj.properties) {
        if (prop.type !== 'Property') continue;

        const key = !prop.computed
          ? getKeyName(prop.key)
          : getStringValue(prop.key);

        if (key === null) continue;

        if (seen.has(key)) {
          context.report({
            node: prop.key,
            messageId: 'duplicateState',
            data: { key },
          });
        } else {
          seen.set(key, prop.key);
        }
      }
    }

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

          // Skip sub-elements and special keys
          if (/^[A-Z@&]/.test(key)) continue;

          // Check state map objects for duplicates
          if (prop.value.type === 'ObjectExpression') {
            checkDuplicates(prop.value);
          }
        }
      },
    };
  },
});
