import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName, getStringValue, isKnownStateAlias } from '../utils.js';

type MessageIds = 'unknownAlias';

export default createRule<[], MessageIds>({
  name: 'no-unknown-state-alias',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Warn when a @name state alias is used that isn't in the config",
    },
    messages: {
      unknownAlias: "Unknown state alias '{{alias}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkStateKeys(obj: TSESTree.ObjectExpression): void {
      for (const prop of obj.properties) {
        if (prop.type !== 'Property') continue;

        const key = !prop.computed
          ? getKeyName(prop.key)
          : getStringValue(prop.key);
        if (key === null || !key.startsWith('@')) continue;

        if (!isKnownStateAlias(key, ctx.config)) {
          context.report({
            node: prop.key,
            messageId: 'unknownAlias',
            data: { alias: key },
          });
        }
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },

      'CallExpression ObjectExpression'(node: TSESTree.ObjectExpression) {
        if (!ctx.isStyleObject(node)) return;

        // Skip if no states configured
        if (ctx.config.states.length === 0) return;

        for (const prop of node.properties) {
          if (prop.type !== 'Property' || prop.computed) continue;

          // Skip sub-elements and special keys
          const key = getKeyName(prop.key);
          if (key === null || /^[A-Z@&]/.test(key)) continue;

          // Check state map objects for unknown aliases
          if (prop.value.type === 'ObjectExpression') {
            checkStateKeys(prop.value);
          }
        }
      },
    };
  },
});
