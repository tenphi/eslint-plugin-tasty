import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName } from '../utils.js';
import { BOOLEAN_TRUE_PROPERTIES } from '../constants.js';

type MessageIds = 'invalidBooleanTrue';

export default createRule<[], MessageIds>({
  name: 'valid-boolean-property',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate that true/false values are only used on properties that support them',
    },
    messages: {
      invalidBooleanTrue:
        "Property '{{name}}' does not accept boolean true. Only these properties support it: {{allowed}}.",
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
        if (/^[A-Z@&$#]/.test(key)) continue;

        // Check for true literal — false is always valid (tombstone)
        if (
          prop.value.type === 'Literal' &&
          prop.value.value === true &&
          !BOOLEAN_TRUE_PROPERTIES.has(key)
        ) {
          context.report({
            node: prop.value,
            messageId: 'invalidBooleanTrue',
            data: {
              name: key,
              allowed: [...BOOLEAN_TRUE_PROPERTIES].join(', '),
            },
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
