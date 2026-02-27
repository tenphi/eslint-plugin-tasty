import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
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

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },

      'CallExpression ObjectExpression Property'(node: TSESTree.Property) {
        const objExpr = node.parent as TSESTree.ObjectExpression;
        const callExpr = objExpr.parent;
        if (
          callExpr?.type !== 'CallExpression' &&
          callExpr?.type !== 'Property'
        )
          return;

        // Find closest object expression that is a style object
        let current: TSESTree.Node | undefined = objExpr;
        while (current) {
          if (
            current.type === 'ObjectExpression' &&
            ctx.isStyleObject(current)
          ) {
            break;
          }
          current = current.parent;
        }
        if (!current) return;

        // Check value
        checkNode(node.value);

        // Check state map values
        if (node.value.type === 'ObjectExpression') {
          for (const stateProp of node.value.properties) {
            if (stateProp.type === 'Property') {
              checkNode(stateProp.value);
            }
          }
        }
      },
    };
  },
});
