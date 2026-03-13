import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getStringValue, extractCustomUnit, isValidUnit } from '../utils.js';

type MessageIds = 'unknownUnit';

export default createRule<[], MessageIds>({
  name: 'valid-custom-unit',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate that custom units in style values are recognized',
    },
    messages: {
      unknownUnit: "Unknown unit '{{unit}}' in value '{{value}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkUnitsInValue(value: string, node: TSESTree.Node): void {
      if (ctx.config.units === false) return;

      // Split by spaces and check each token
      const tokens = value.split(/\s+/);
      for (const token of tokens) {
        // Skip function calls, colors, modifiers, special values
        if (
          token.startsWith('#') ||
          token.startsWith('$') ||
          token.startsWith('@') ||
          token.includes('(') ||
          token.includes(')') ||
          token === 'true' ||
          token === 'false' ||
          token === 'none' ||
          token === 'auto' ||
          token === 'inherit' ||
          token === 'initial' ||
          token === 'unset' ||
          token === 'revert'
        ) {
          continue;
        }

        const unit = extractCustomUnit(token);
        if (unit && !isValidUnit(unit, ctx.config)) {
          context.report({
            node,
            messageId: 'unknownUnit',
            data: { unit, value: token },
          });
        }
      }
    }

    function checkNode(node: TSESTree.Node): void {
      const str = getStringValue(node);
      if (str) {
        checkUnitsInValue(str, node);
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;

        checkNode(prop.value);

        if (prop.value.type === 'ObjectExpression') {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type === 'Property') {
              checkNode(stateProp.value);
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
