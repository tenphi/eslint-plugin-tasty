import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { DIRECTIONAL_MODIFIERS } from '../constants.js';

type MessageIds = 'invalidDirectionalModifier';

const ALL_DIRECTIONS = new Set([
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]);

export default createRule<[], MessageIds>({
  name: 'valid-directional-modifier',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate that directional modifiers are used only on properties that support them',
    },
    messages: {
      invalidDirectionalModifier:
        "Property '{{property}}' does not support directional modifier '{{modifier}}'.",
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
      const tokens = value.trim().split(/\s+/);

      for (const token of tokens) {
        if (!ALL_DIRECTIONS.has(token)) continue;

        const allowedMods = DIRECTIONAL_MODIFIERS[property];
        if (!allowedMods || !allowedMods.has(token)) {
          context.report({
            node,
            messageId: 'invalidDirectionalModifier',
            data: { property, modifier: token },
          });
        }
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        if (!(key in DIRECTIONAL_MODIFIERS)) continue;

        // Direct value
        const str = getStringValue(prop.value);
        if (str) {
          checkValue(key, str, prop.value);
          continue;
        }

        // State map
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
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
