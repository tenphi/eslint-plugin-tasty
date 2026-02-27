import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { getParser } from '../parser.js';
import { getExpectation } from '../property-expectations.js';

type MessageIds =
  | 'unbalancedParens'
  | 'importantNotAllowed'
  | 'unexpectedMod'
  | 'unexpectedColor'
  | 'invalidMod';

export default createRule<[], MessageIds>({
  name: 'valid-value',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Parse style values through the tasty parser and validate against per-property expectations',
    },
    messages: {
      unbalancedParens: 'Unbalanced parentheses in value.',
      importantNotAllowed:
        'Do not use !important in tasty styles. Use state specificity instead.',
      unexpectedMod:
        "Unrecognized token '{{mod}}' in '{{property}}' value. This may be a typo.",
      unexpectedColor:
        "Property '{{property}}' does not accept color tokens, but found '{{color}}'.",
      invalidMod:
        "Modifier '{{mod}}' is not valid for '{{property}}'. Accepted: {{accepted}}.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkParenBalance(value: string, node: TSESTree.Node): boolean {
      let depth = 0;
      for (const char of value) {
        if (char === '(') depth++;
        if (char === ')') depth--;
        if (depth < 0) {
          context.report({ node, messageId: 'unbalancedParens' });
          return false;
        }
      }
      if (depth !== 0) {
        context.report({ node, messageId: 'unbalancedParens' });
        return false;
      }
      return true;
    }

    function checkValue(
      value: string,
      property: string | null,
      node: TSESTree.Node,
    ): void {
      if (!checkParenBalance(value, node)) return;

      if (value.includes('!important')) {
        context.report({ node, messageId: 'importantNotAllowed' });
        return;
      }

      if (!property) return;

      const parser = getParser(ctx.config);
      const result = parser.process(value);
      const expectation = getExpectation(property);

      for (const group of result.groups) {
        if (!expectation.acceptsColor && group.colors.length > 0) {
          for (const color of group.colors) {
            context.report({
              node,
              messageId: 'unexpectedColor',
              data: { property, color },
            });
          }
        }

        if (expectation.acceptsMods === false && group.mods.length > 0) {
          for (const mod of group.mods) {
            context.report({
              node,
              messageId: 'unexpectedMod',
              data: { property, mod },
            });
          }
        } else if (
          Array.isArray(expectation.acceptsMods) &&
          group.mods.length > 0
        ) {
          const allowed = new Set(expectation.acceptsMods);
          for (const mod of group.mods) {
            if (!allowed.has(mod)) {
              context.report({
                node,
                messageId: 'invalidMod',
                data: {
                  property,
                  mod,
                  accepted: expectation.acceptsMods.join(', '),
                },
              });
            }
          }
        }
      }
    }

    function processProperty(prop: TSESTree.Property): void {
      const key = !prop.computed ? getKeyName(prop.key) : null;

      if (key && (/^[A-Z]/.test(key) || key.startsWith('@'))) return;
      if (key && (key.startsWith('$') || key.startsWith('#'))) return;
      if (key && key.startsWith('&')) return;

      const str = getStringValue(prop.value);
      if (str) {
        checkValue(str, key, prop.value);
        return;
      }

      // State map
      if (prop.value.type === 'ObjectExpression') {
        for (const stateProp of prop.value.properties) {
          if (stateProp.type !== 'Property') continue;
          const stateStr = getStringValue(stateProp.value);
          if (stateStr) {
            checkValue(stateStr, key, stateProp.value);
          }
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
          if (prop.type !== 'Property') continue;
          processProperty(prop);
        }
      },
    };
  },
});
