import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';

type MessageIds = 'preferToken';

const PX_TO_UNIT: Record<string, string> = {
  '8px': '1x',
  '16px': '2x',
  '24px': '3x',
  '32px': '4x',
  '40px': '5x',
  '48px': '6x',
  '56px': '7x',
  '64px': '8x',
};

export default createRule<[], MessageIds>({
  name: 'consistent-token-usage',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest using design tokens and custom units instead of raw CSS values',
    },
    messages: {
      preferToken: "Consider using '{{suggestion}}' instead of '{{raw}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkValue(
      property: string,
      value: string,
      node: TSESTree.Node,
    ): void {
      const trimmed = value.trim();

      // Check pixel values that map to gap multiples
      if (trimmed in PX_TO_UNIT) {
        context.report({
          node,
          messageId: 'preferToken',
          data: { suggestion: PX_TO_UNIT[trimmed], raw: trimmed },
        });
        return;
      }

      // Check 6px in radius context
      if (property === 'radius' && trimmed === '6px') {
        context.report({
          node,
          messageId: 'preferToken',
          data: { suggestion: '1r', raw: '6px' },
        });
        return;
      }

      // Check 1px in border context
      if (property === 'border' && trimmed.includes('1px')) {
        context.report({
          node,
          messageId: 'preferToken',
          data: { suggestion: '1bw', raw: '1px' },
        });
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

          const str = getStringValue(prop.value);
          if (str) {
            checkValue(key, str, prop.value);
            continue;
          }

          if (prop.value.type === 'ObjectExpression') {
            for (const stateProp of prop.value.properties) {
              if (stateProp.type !== 'Property') continue;
              const stateStr = getStringValue(stateProp.value);
              if (stateStr) {
                checkValue(key, stateStr, stateProp.value);
              }
            }
          }
        }
      },
    };
  },
});
