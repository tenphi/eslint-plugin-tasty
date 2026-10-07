import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { styleValueListeners } from '../style-values.js';
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

    function report(name: string, node: TSESTree.Node): void {
      context.report({
        node,
        messageId: 'invalidBooleanTrue',
        data: { name, allowed: [...BOOLEAN_TRUE_PROPERTIES].join(', ') },
      });
    }

    return styleValueListeners(ctx, (key, node) => {
      if (/^[#$]/.test(key) || BOOLEAN_TRUE_PROPERTIES.has(key)) return;
      if (
        (node.type === 'Literal' && node.value === true) ||
        node.type === 'JSXAttribute'
      ) {
        report(key, node);
      }
    });
  },
});
